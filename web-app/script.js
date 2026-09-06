$(document).ready(function(){

    function showNoResults() {
        $('.display-controls').css('display', 'none')
        $('.no-results-banner').css('display', 'block')
        if ($('#parsed-file-view').attr('selected') == 'selected'){
            $('.parsed-doc').css('display', 'none')
        } else {
            $('.doc-embed').css('display', 'none')
        }
    }

    function showResults() {
        $('.display-controls').css('display', 'block')
        $('.no-results-banner').css('display', 'none')
        if ($('#parsed-file-view').attr('selected') == 'selected'){
            $('.parsed-doc').css('display', 'block')
        } else {
            $('.doc-embed').css('display', 'block')
        }
    }

    function updatePage(data) {
        $('.parsed-doc').empty()
        showResults()
        console.log(urlParams.get('unitid'))
        console.log(data)
        if (urlParams.get('unitid') in data) {
            var collegeData = data[urlParams.get('unitid')]

            var possible_years = Object.keys(collegeData['years'])

            for (i in possible_years) {
                $('<option>' + possible_years[i] + '</option>').appendTo('#year-select')
            }

            $( "#year-select" ).selectmenu();

            $('.inst-name').text(collegeData['INSTNM'])
            var year = $('#year-select').val()

            if (year in collegeData['years']) {
                $('.doc-embed').attr('src', collegeData['years'][year]['file'])
                var tables = collegeData['years'][year]['parsed_tables']
                $.each(tables, function(index, entry) {
                    var data_block = $('<div class="data-block section section-' + entry['section'].toLowerCase() + '"></div>').appendTo('.parsed-doc')
                    var data_heading = $('<div class="data-heading"></div>').appendTo(data_block)
                    var table_code = $('<div class="table-code">' + entry['table_code'] + '</span>').appendTo(data_heading)
                    var table_name = $('<div class="table-title">' + entry['table_title'] + '</span>').appendTo(data_heading)
                    var data_table = $('<div class="data-table">' + entry['table_html'] + '</div>').appendTo(data_block)
                });
                $('.separator').append('<div class="download-button">Download <i class="fa-solid fa-download"></i></div>')
            } else {
                showNoResults()
            }
        } else {
            showNoResults()
        }
    }

    function selectiveDisplaySection(section) {
        if (section == 'All Sections') {
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
    var dataUrl = 'web-app/colleges/' + urlParams.get('unitid') + '.json'
    console.log(dataUrl)

    $.getJSON(dataUrl, function(data) {
        console.log(data)
        updatePage(data)

        $('#year-select').on('selectmenuchange', function(e) {
            updatePage(data)
        })

        $('#raw-file-view').on('click', function() {
            $('.view-button').css('background-color', 'white').css('color', 'black').removeAttr('selected')
            $(this).css('background-color', 'black').css('color', 'white').attr('selected', 'selected')
            $('.parsed-doc').css('display', 'none')
            $('.doc-embed').css('display', 'block')
        })

        $('#parsed-file-view').on('click', function() {
            $('.view-button').css('background-color', 'white').css('color', 'black').removeAttr('selected')
            $(this).css('background-color', 'black').css('color', 'white').attr('selected', 'selected')
            $('.parsed-doc').css('display', 'block')
            $('.doc-embed').css('display', 'none')
        })
    });
    console.log('hello world')

    $('#pagination').css('display', 'none')
}); 