$(document).ready(function(){
    console.log('hello world')
    $.getJSON('web-app/data.json', function(data) {
        $.each(data['236328'], function(index, entry) {
            var data_block = $('<div class="data-block"></div>').appendTo('.parsed-doc')
            var data_heading = $('<div class="data-heading"></div>').appendTo(data_block)
            var table_code = $('<div class="table-code">' + entry['table_code'] + '</span>').appendTo(data_heading)
            var table_name = $('<div class="table-title">' + entry['table_title'] + '</span>').appendTo(data_heading)
            var data_table = $('<div class="data-table">' + entry['table_html'] + '</div>').appendTo(data_block)
        });
        $('.separator').append('<div class="download-button">Download <i class="fa-solid fa-download"></i></div>')
    });

}); 