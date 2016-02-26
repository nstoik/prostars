function highlight_row(ctrl) {
    var elements=document.getElementsByTagName('tr');
    for(var i=0;i<elements.length;i++)
        elements[i].classList.remove('backChange'); //remove one particular class from list of classNames in that element
    ctrl.classList.add("backChange");//Add that particular class to classList of element's parent tr
}

function create_table_row_player (item) {
    var row = $('<tr>' + 
        '<td>' + item.Name + '</td>' + 
        '<td>' + item.Type + '</td>' + 
        '<td>' + item.Division + '</td>' + 
        '<td>' + item.Year + '</td>' + 
        '<td>' + item.Season + '</td>' + 
        '<td>' + item.Night + '</td>' + 
        '<td>' + item.Gender + '</td>' + 
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
        var select_name = outer_item.shift(),
        select_id = $('#' + select_name)
        if (outer_item.length > 10) {
            $(select_id).multiselect({
                maxHeight: 250,
                includeSelectAllOption: true,
                checkboxName: 'multiselect[]',
                nonSelectedText: 'None Selected',
                numberDisplayed: 1,
                enableFiltering: true,
                enableCaseInsensitiveFiltering: true
            });
        }
        else {
            $(select_id).multiselect({
                maxHeight: 250,
                includeSelectAllOption: true,
                checkboxName: 'multiselect[]',
                nonSelectedText: 'None Selected',
                numberDisplayed: 2,
            });
        }
        var options =[]
        $.each(outer_item, function(index, item){
            options.push(item)
        });
         $(select_id).multiselect('dataprovider', options);
    });
}

function load_default () {
    $.ajax({
        url: '/stats/load_default/',
        type: 'GET',
        beforeSend: function(){
            loading.showLoading();
        },
        complete: function(){
            //$('#loading-image').remove();
            loading.hideLoading();
        },
        success : function(data) {
            //$('#loading-image').remove();
            sessionStorage.setItem('player_data', JSON.stringify(data.row_data))          
            sessionStorage.setItem('player_filter_criteria', JSON.stringify(data.filter_criteria))            
            $.each(data.row_data, function(index, item){
                var row = create_table_row_player(item);
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

function show_players () {
    if ('player_data' in sessionStorage && 'player_filter_criteria' in sessionStorage) {
        $.each(JSON.parse(sessionStorage.getItem('player_data')), function(index, item){
            var row = create_table_row_player(item);
            $('table tbody').append(row);
        });    
        $('table').trigger('footable_redraw');
        load_filters(JSON.parse(sessionStorage.getItem('player_filter_criteria')))
    }
    else {
        load_default()
    }
}

var loading;
loading = loading || (function () {
    return {
        showLoading: function() {
            $("#loadingDialog").modal()
        },
        hideLoading: function () {
            $("#loadingDialog").modal('hide')
        },

    };
})();