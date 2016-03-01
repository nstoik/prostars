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
            loading.hideLoading();
        },
        success : function(data) {
            //store data in sessionStorage
            sessionStorage.setItem('player_data', JSON.stringify(data.row_data))          
            sessionStorage.setItem('player_filter_criteria', JSON.stringify(data.filter_criteria))            
            //add data to table rows
            $.each(data.row_data, function(index, item){
                var row = create_table_row_player(item);
                $('table tbody').append(row);
            });    
            $('table').trigger('footable_redraw');
            //gather filter meta data
            var filter_metadata = []
            $.each(data.filter_criteria, function(index, item){
                var temp = {
                    'item_name': item[0],
                    'total_options': item.length - 1
                };
                filter_metadata.push(temp);
            });
            sessionStorage.setItem('player_filter_metadata',JSON.stringify(filter_metadata))
            //add filter criteria
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
//reload data from the server
function reload_data () {
    $('#collapse1').collapse('hide')
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $("#player-table > tbody").html("");
    load_default()
    //force a redraw   
    $('table').trigger('footable_redraw');
            
};

//reset filter data
function reset_filter () {

};

//apply the filter choices to the table
function apply_filter () {

    
    var applied_filters = []
    //get the applied filters
    filter_metadata = JSON.parse(sessionStorage.getItem('player_filter_metadata'))
    $.each(filter_metadata, function(index, item){
        var select_name = item.item_name
        var selectedOptionValue = $("#" + select_name + " option:selected")
        
        //make sure at least one option is selected
        if (selectedOptionValue.length == 0) {
            alert("You need to select at least one item for: " + select_name)
            return false
        }
        //skip selection if all items are selected
        if (selectedOptionValue.length == item.total_options) {
            return
        }
        //gather the options selected
        var single_filter = {
            'item_name': select_name,
            'selected_options' : []
        }
        for (var i = 0; i < selectedOptionValue.length; i++) {
            single_filter.selected_options.push(selectedOptionValue[i].value)
        }
        applied_filters.push(single_filter)
    });
    //if there are no filters to apply, exit
    if (applied_filters.length == 0) {
        return
    }
    //filter the rows
    row_data = JSON.parse(sessionStorage.getItem('player_data'))
    rows_to_remove = []
    //for each row of data
    for (var r = 0; r < row_data.length; r++) {
        //for each filter in applied filters
        for (var f = 0; f < applied_filters.length; f++){
            filter_name = applied_filters[f].item_name
            filter_options = applied_filters[f].selected_options
            //chech if the data from the row is in the filter
            if (filter_options.indexOf(row_data[r][filter_name].toString()) == -1) {
                rows_to_remove.push(r)
                break
            }
            
        }
    }
    //now remove all the rows that need to be
    //need to traverse the array backwards
    for (var i = rows_to_remove.length - 1; i >= 0; i--) {
        row_data.splice(rows_to_remove[i],1)
    }

    //show rows
    $("#player-table > tbody").html("");
    for (var i = 0; i < row_data.length; i++) {
        var row = create_table_row_player(row_data[i]);
        $('table tbody').append(row); 
    }  
    $('table').trigger('footable_redraw');
    
};

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