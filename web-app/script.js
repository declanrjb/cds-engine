$(document).ready(function(){
    $( "select" ).selectmenu();

    const queryString = window.location.search;

    // 2. Parse the parameters using URLSearchParams
    const urlParams = new URLSearchParams(queryString);



    $.getJSON('web-app/data.json', function(data) {
        if (urlParams.get('unitid') in data) {
            $.each(data[urlParams.get('unitid')], function(index, entry) {
                var data_block = $('<div class="data-block"></div>').appendTo('.parsed-doc')
                var data_heading = $('<div class="data-heading"></div>').appendTo(data_block)
                var table_code = $('<div class="table-code">' + entry['table_code'] + '</span>').appendTo(data_heading)
                var table_name = $('<div class="table-title">' + entry['table_title'] + '</span>').appendTo(data_heading)
                var data_table = $('<div class="data-table">' + entry['table_html'] + '</div>').appendTo(data_block)
            });
            $('.separator').append('<div class="download-button">Download <i class="fa-solid fa-download"></i></div>')
        } else {
            $('.no-results-banner').css('display', 'block')
        }
        
    });

    $('#pagination').css('display', 'none')
}); 