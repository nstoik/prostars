function highlight_row(ctrl) {
    var elements=document.getElementsByTagName('tr');
    for(var i=0;i<elements.length;i++)
        elements[i].classList.remove('backChange'); //remove one particular class from list of classNames in that element
    ctrl.classList.add("backChange");//Add that particular class to classList of element's parent tr
}

function create_table_row_skater (item) {
    var row = $('<tr onClick="highlight_row(this)">' + 
        '<td>' + item.Type + '</td>' + 
        '<td>' + item.Division + '</td>' + 
        '<td>' + item.Year + '</td>' + 
        '<td>' + item.Season + '</td>' + 
        '<td>' + item.Night + '</td>' + 
        '<td>' + item.Gender + '</td>' + 
        '<td>' + item.Name + '</td>' + 
        '<td>' + item.GP + '</td>' + 
        '<td>' + item.G + '</td>' +
        '<td>' + item.A + '</td>' +
        '<td>' + item.P + '</td>' +
        '<td>' + item.Plus_Minus + '</td>' +
        '<td>' + item.PIM + '</td> ' +
        '<td>' + item.PPG + '</td>' +
        '<td>' + item.SO_G + '</td>' +
        '<td>' + item.SO_A + '</td>' +
        '<td>' + item.SO_Pct + '</td>' +
        '</tr>');
    return row;
}

function load_filters (filters) {
    $.each(filters, function(index, outer_item){
        var select_id = $('#' + outer_item.shift())
        $(select_id).multiselect({
            includeSelectAllOption: true
        });
        var options =[]
        $.each(outer_item, function(index, item){
            options.push(item)
        });
         $(select_id).multiselect('dataprovider', options);
    });
}

function load_default () {
    $.ajax({
        url : '/stats/load_default/',
        data: {  },
        beforeSend: function(){
        },
        complete: function(){
            $('#loading-image').remove();
        },
        success : function(data) {
            $('#loading-image').remove();
            $.each(data.row_data, function(index, item){
                var row = create_table_row_skater(item);
                $('table tbody').append(row);
            });    
            $('table').trigger('footable_redraw');
            load_filters(data.filter_criteria)
        },
        error : function(xhr, statusText, error) { 
            alert("Error! Could not retrieve the data " + error);
        }
    });
}