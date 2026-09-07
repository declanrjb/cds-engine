// https://stackoverflow.com/questions/32228564/html-embedded-pdf-all-links-override-to-open-in-a-new-tab-target-blank

$(document).ready(function(){

    function showNoResults() {
        $('.display-controls').css('display', 'none')
        $('.no-results-banner').css('display', 'block')
        if ($('#parsed-file-view').attr('selected') == 'selected'){
            $('.parsed-doc').css('display', 'none')
        } else {
            $('#doc-embed').css('display', 'none')
        }
    }

    function showResults() {
        $('.display-controls').css('display', 'block')
        $('.no-results-banner').css('display', 'none')
        if ($('#parsed-file-view').attr('selected') == 'selected'){
            $('.parsed-doc').css('display', 'block')
        } else {
            $('#doc-embed').css('display', 'block')
        }
    }

    function showRaw() {
        console.log('show raw')
        $('.view-button').css('background-color', 'white').css('color', 'black').removeAttr('selected')
        $('#raw-file-view').css('background-color', 'black').css('color', 'white').attr('selected', 'selected')
        $('.parsed-doc').css('display', 'none')
        $('#doc-embed').css('display', 'block')
    }

    function showParsed() {
        console.log('show parsed')
        $('.view-button').css('background-color', 'white').css('color', 'black').removeAttr('selected')
        $('#parsed-file-view').css('background-color', 'black').css('color', 'white').attr('selected', 'selected')
        $('.parsed-doc').css('display', 'block')
        $('#doc-embed').css('display', 'none')
    }

    function updatePage(collegeData) {
        $('.parsed-doc').empty()
        showResults()

        var possible_years = Object.keys(collegeData['years'])

        for (i in possible_years) {
            $('<option>' + possible_years[i] + '</option>').appendTo('#year-select')
        }

        $( "#year-select" ).selectmenu();

        $('.inst-name').text(collegeData['INSTNM'])
        var year = $('#year-select').val()

        if (year in collegeData['years']) {
            $('#doc-embed').attr('src', collegeData['years'][year]['file'])

            // PDFObject.embed(collegeData['years'][year]['file'], "#doc-embed", options);

            if ('parsed_tables' in collegeData['years'][year]) {
                var tables = collegeData['years'][year]['parsed_tables']
                $.each(tables, function(index, entry) {
                    var data_block = $('<div class="data-block section section-' + entry['section'].toLowerCase() + '"></div>').appendTo('.parsed-doc')
                    var data_heading = $('<div class="data-heading"></div>').appendTo(data_block)
                    var table_code = $('<div class="table-code">' + entry['table_code'] + '</span>').appendTo(data_heading)
                    var table_name = $('<div class="table-title">' + entry['table_title'] + '</span>').appendTo(data_heading)
                    var data_table = $('<div class="data-table">' + entry['table_html'] + '</div>').appendTo(data_block)
                });
                // $('.separator').append('<div class="download-button">Download <i class="fa-solid fa-download"></i></div>')
                showParsed()
            } else {
                showRaw()
            }

        } else {
            showNoResults()
        }
    }

    function selectiveDisplaySection(section) {
        if (section == 'section-All Sections') {
            $('.section').css('display', 'block')
        } else {
            $('.section').css('display', 'none')
            $('.' + section).css('display', 'block')
        }
    }

    $.getJSON('web-app/sections.json', function(data) {
        $.each(data['sections'], function(index, entry) {
            $('<option>' + entry['nicename'] + '</option>').appendTo('#section-select')
        });

        $( "#section-select" ).selectmenu();

        $('#section-select').on('selectmenuchange', function(e) {
            var new_section = 'section-' + $('#section-select').val().split('.')[0].toLowerCase()
            selectiveDisplaySection(new_section)
        })
    });

    const queryString = window.location.search;

    // 2. Parse the parameters using URLSearchParams
    const urlParams = new URLSearchParams(queryString);
    var dataUrl = 'https://raw.githubusercontent.com/declanrjb/cds-engine/refs/heads/main/web-app/colleges/' + urlParams.get('unitid') + '.json'
    console.log(dataUrl)

    $.getJSON(dataUrl, function(data) {
        console.log('inside data load function')
        console.log(data)
        updatePage(data)

        $('#year-select').on('selectmenuchange', function(e) {
            updatePage(data)
        })

        $('#raw-file-view').on('click', showRaw)

        $('#parsed-file-view').on('click', showParsed)
    });
    console.log('passed data load function')

    $('#pagination').css('display', 'none')
}); 