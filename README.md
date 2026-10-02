# About this Site

The Common Data Set (CDS) is a collection of standardized metrics published by both private and public colleges across the United States. The CDS contains data found nowhere else, from admissions statistics to financial aid numbers, but remains locked in a byzantine system of distribution that makes it difficult for education reporters and researchers to access. This database and associated search engine is an attempt to bring these valuable documents into the public domain and encourage their use in education reporting.

# Methodology

Below, we present key parts of the code used to acquire these documents and generate the search engine. For complete working code, see [notebooks](./notebooks).

## Acquiring Documents

While the Common Data Set initiative maintains its own collection of documents submitted by universities, that collection is not available to the public. Instead, each institution posts its own data to its own website as one or more pdf documents. There are no commonly accepted standards for where or in what format these documents should be posted. Thus we must resort to automated search to acquire them.

We begin with the latest IPEDS directory file, which contains the name and primary web address for every college in the United States in CSV format. Most institutions host all of their CDS docs on a single webpage, so rather than running a filetype search for pdfs we'll attempt to find the wrapper landing page that contains them all.

```python
def search_for_cds_file_by_name(unitid, instnm, domain):
    query = f"{instnm} common data set"
    try:
        results = DDGS().text(query, max_results=1)
        print(f'Success on {domain}')
    except:
        print(f'No results found for {domain}')
        return None
    
    df = pd.DataFrame(results)
    df['unitid'] = unitid
    df['domain'] = domain

    return df
```

Once we've built up a dataframe of CDS landing pages and spot-checked it for accuracy, we can move on to building a dataframe of file links that appear on those pages.

```python
def extract_data_files(unitid, url, force_driver=False):
    print(f'Scanning {url}')
    domain = extract_domain(url)

    file_extension = url.split('.')[-1]
    if file_extension == 'pdf':
        data_files = pd.DataFrame({
            'link': [url],
            'label': f'{unitid}_base-file',
            'domain': domain,
            'unitid': unitid
        })
        return data_files

    try:
        response = requests.get(url, headers=headers)
    except:
        print(f'WARNING: failed to get {url} with no status code')
        return None

    time.sleep(3)
    if response.status_code == 200 and not force_driver:
        soup = BeautifulSoup(response.content)

        anchors = soup.select('a')
        anchors = [anchor for anchor in anchors if anchor.has_attr('href')]

        pdf_anchors = [anchor for anchor in anchors if 'pdf' in anchor['href']]
        file_anchors = [anchor for anchor in anchors if 'file' in anchor['href'] or 'download' in anchor['href']]
        excel_anchors = [anchor for anchor in anchors if 'xlsx' in anchor['href'] or 'excel' in anchor['href']]
        anchors = pd.Series(pdf_anchors + file_anchors + excel_anchors).unique()

        pdf_links = [anchor['href'] for anchor in anchors]
        anchor_labels = [anchor.text.replace(' ', '') for anchor in anchors]
    elif response.status_code == 403 or force_driver:
        try:
            driver.get(url)
        except:
            return None
        time.sleep(3)
        anchors = driver.find_elements(By.CSS_SELECTOR, 'a')

        anchors = [anchor for anchor in anchors if anchor.get_attribute('href') is not None]
        
        pdf_anchors = [anchor for anchor in anchors if 'pdf' in anchor.get_attribute('href')]
        file_anchors = [anchor for anchor in anchors if 'file' in anchor.get_attribute('href') or 'download' in anchor.get_attribute('href') or 'document' in anchor.get_attribute('href')]
        excel_anchors = [anchor for anchor in anchors if 'xlsx' in anchor.get_attribute('href') or 'excel' in anchor.get_attribute('href')]
        anchors = pd.Series(pdf_anchors + file_anchors + excel_anchors).unique()

        pdf_links = [anchor.get_attribute('href') for anchor in anchors]
        anchor_labels = [anchor.text.replace(' ', '') for anchor in anchors]
    else:
        print(f'WARNING: failed to get {url} with status code {response.status_code}')
        return None

    data_files = pd.DataFrame({
        'link': pdf_links,
        'label': anchor_labels,
        'domain': domain,
        'unitid': unitid,
        'homepage': url
    })

    return data_files
```

Since this is a very long-running process, we'll check track of it with a status output.

```python
result_frames = []
for i in range(0, len(df['unitid'])):
    unitid = df['unitid'][i]
    url = df['href'][i]

    result = extract_data_files_wrapper(unitid, url, force_driver=True)
    if result is not None:
        print(f'✅ Extracted {len(result)} data files')
    else:
        print('❌ No data files found')
    result_frames.append(result)

    if i % 100 == 0:
        print(f'{i / len(df["unitid"])*100}% complete')
        data_files = pd.concat(result_frames)

data_files = pd.concat(result_frames)
```

Once we've isolated all the files and subjected them to a battery of verification checks (mimetype = pdf, url fuzzy matches "common data set" or a similar phrase, etc), we download them all using requests and selenium, and proceed to constructing the engine

## Constructing the Engine

This web interface is computationally generated from the folder of raw Common Data Sets contained in [data/cds-docs](data/cds-docs/). Here, we bootstrap the interface from the raw data.

We'll use Tesseract OCR to parse the visual structure of each CDS document. While many use a similar layout, they **do not** have a required national format, and not all will render a clean parse using `pdfplumber` or `naturalpdf` table extraction.

```python
ocr = TesseractOCR()
```

The internal structure of the documents does not cleanly connect section headings to tables, so we keep a running "tape" that traverses the page from top to bottom and keeps track of the most recent heading it has seen, assigning that into subsequently parsed tables until it sees a new heading.

```python
def select_best_heading(page, table, headers):
    if len(headers) == 0:
        return ''
    headers['is_above'] = headers['top'].apply(lambda x: x < table.bbox.relative.y1 * page.height)
    headers = headers[headers['is_above']].sort_values('top', ascending=False).reset_index(drop=True)
    if len(headers) == 0:
        return ''
    return headers['text'][0]
```

We extract all of the tables from a single page of text using Tesseract OCR, using the above function to assign the most appropriate heading to each one. We store the data as a list of dictionaries, with the table data stored as both JSON and HTML. We'll use the JSON for data parsing and search, the HTML for rendering the search engine interface.

```python
def parse_page_tables(file, page_index):
    pdf = pdfplumber.open(file)
    page = pdf.pages[page_index]
    headers = extract_headers(page)

    doc = PDF(file,
          pages=[page_index],
          detect_rotation=False,
          pdf_text_extraction=True)

    results = doc.extract_tables(ocr=ocr,
                    implicit_rows=False,
                    implicit_columns=False,
                    borderless_tables=False,
                    min_confidence=50,
                    max_workers=1)

    data = []
    for table in results[page_index]:
        heading = select_best_heading(page, table, headers)
        code_match = re.search('^[A-Z]{1}[0-9]+', heading)
        if code_match is not None:
            code = code_match.group(0).strip()
        else:
            code = ''

        heading = heading.replace(code, '')
        heading = re.sub('^\\.', '', heading)
        heading = heading.strip()

        data.append({
            'table_code': code,
            'table_title': heading,
            'table_records': table.df.fillna('').to_dict(orient='records'),
            'table_html': re.sub('[\n ]+', ' ', table.html)
        })

    return data
```

We iteratively apply the single-page extractor function above to all of the pages in the document, rendering a complete JSON file for a single institution.

```python
def extract_data_from_file(file):
    year = file.split('/')[-2].strip()
    print(file)
    try:
        pdf = pdfplumber.open(file)
    except:
        return None
    unitid = file.split('/')[-1].replace('.pdf', '').strip()

    data = []
    for page in range(0, len(pdf.pages)):
        try:
            data.extend(parse_page_tables(file, page))
        except:
            continue

    if len(data) == 0:
        return None

    data = pd.DataFrame(data)

    data = data[data['table_code'] != '']

    data = data.groupby('table_code').agg({
        'table_code': first,
        'table_title': first,
        'table_records': list,
        'table_html': lambda tables: '<div class="separator"></div>'.join(tables)
    }).reset_index(drop=True)

    data['table_num'] = data['table_code'].apply(lambda x: re.search('[0-9]+', x).group(0)).apply(int)
    data['section'] = data['table_code'].apply(lambda x: re.search('[A-Z]+', x).group(0))
    data = data.sort_values(['section', 'table_num'])

    data = data[['section', 'table_num', 'table_code', 'table_title', 'table_records', 'table_html']]
    data['unitid'] = unitid
    data['file'] = file
    data['year'] = year

    return data
```

We run the extractor function to assemble a single JSON file for each institution and write it to the database directory, printing a status update after completing each institution. The rendered JSON files will then be loaded by the search engine interface to render the procedurally generated pages.

```python
for unitid in site_directory['unitid'].unique():
    temp_directory = directory.query(f'UNITID == "{unitid}"')
    temp_directory['UNITID'] = temp_directory['UNITID'].apply(int)

    college_df = df.query(f'unitid == "{unitid}"').reset_index(drop=True)
    site_files = site_directory.query(f'unitid == "{unitid}"')

    if len(temp_directory) == 0:
        print(f'{unitid} has no ipeds entry')
        continue
        
    inst_data = temp_directory.to_dict(orient='records')[0]
    inst_data['years'] = {}

    for year, file in zip(site_files['year'], site_files['file']):
        inst_data['years'][year] = {}
        inst_data['years'][year]['file'] = file

        temp_tables = college_df.query(f'year == "{year}"').reset_index(drop=True)
        if len(temp_tables) > 0:
            inst_data['years'][year]['parsed_tables'] = temp_tables.to_dict(orient='records')
        else:
            print(f'{unitid}, {year} has no parsed files')

    with open(f'../web-app/colleges/{unitid}.json', 'w') as out_file:
        json.dump(inst_data, out_file)
        print(f'✅ Wrote JSON data for {inst_data["INSTNM"]}')
```
