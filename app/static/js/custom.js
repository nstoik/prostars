function highlight_row(ctrl) {
    var elements=document.getElementsByTagName('tr');
    for(var i=0;i<elements.length;i++)
        elements[i].classList.remove('backChange'); //remove one particular class from list of classNames in that element
    ctrl.classList.add("backChange");//Add that particular class to classList of element's parent tr
}

function load_filters (filters) {
    $.each(filters, function(index, outer_item){
        var select_name = outer_item.shift(),
        select_id = $('#' + select_name)

        $(select_id).multiselect({
            maxHeight: 250,
            includeSelectAllOption: true,
            nSelectedText: select_name,
            numberDisplayed: 2,
            buttonText: function(options, select) {
                var numberOfOptions = $('#'+this.nSelectedText+' option').length;
                
                if (options.length === 0) {
                    return this.nSelectedText;
                }
                else if (options.length > this.numberDisplayed) {
                    return this.nSelectedText + ' (' + options.length + ')';
                }
                else if (options.length === numberOfOptions) {
                    return this.nSelectedText + ' (' + options.length + ')';
                }

                else {
                    var labels = [];
                    options.each(function() {
                        if ($(this).attr('label') !== undefined) {
                            labels.push($(this).attr('label'));
                        }
                        else {
                            labels.push($(this).html());
                        }  
                    });
                    return labels.join(', ') + '';
                }
            }
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
        url: '/stats/load_default/',
        type: 'GET',
        beforeSend: function(){
            loading.showLoading();
        },
        complete: function(){
            loading.hideLoading();
        },
        success : function(data) {
             //gather filter meta data
            var filter_metadata = []
            $.each(data.filter_criteria, function(index, item){
                var temp = {
                    'item_name': item[0],
                    'total_options': item.length - 1
                };
                filter_metadata.push(temp);
            });
            //store data in sessionStorage
            sessionStorage.setItem('player_data', JSON.stringify(data.row_data))          
            sessionStorage.setItem('player_filter_criteria', JSON.stringify(data.filter_criteria))
            sessionStorage.setItem('player_filter_metadata',JSON.stringify(filter_metadata))
            
            //load table and filter data. This always needs to be
            //done in the succes callback
            load_table();
            load_filters(data.filter_criteria);
        },
        error : function(xhr, statusText, error) { 
            alert("Error! Could not retrieve the data " + error);
        }
    });
}
function get_data () {
    if (!('player_data' in sessionStorage)) {
        load_default()
        //return early to allow async of data fetch
        return false
    }
    //we already have the data. Just load filters and return player data
    load_filters(JSON.parse(sessionStorage.getItem('player_filter_criteria')))
    return JSON.parse(sessionStorage.getItem('player_data'))
}

function load_table() {
    dataSet = get_data()
    //if data was not available exit early
    if (dataSet === false) {
        return
    }
    var t = $('table').DataTable({
        scrollX: true,
        //searching: false,
        fixedColumns:   {
            leftColumns: 2
        },
        data: dataSet,
        columns: [
            {   "searchable": false,
                "orderable": false,
                "defaultContent": ""
            },
            { data: "Name" },
            { data: "Type" },
            { data: "Division" },
            { data: "Year" },
            { data: "Season" },
            { data: "Night" },
            { data: "Gender" },
            { data: "GP" },
            { data: "G" },
            { data: "A" },
            { data: "P" },
            { data: "Plus_Minus" },
            { data: "PIM" },
            { data: "PPG" },
            { data: "SO_G" },
            { data: "SO_A" },
            { data: "SO_Pct" }
        ],
    "order": [[ 1, 'asc' ]]
    });

    //for rank column
    t.on( 'order.dt search.dt', function () {
        t.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        });
    }).draw();    
}

//reload data from the server
function reload_data () {
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $("#player-table > tbody").html("");
    load_default()
    //force a redraw   
    var table = $('table').DataTable();
    table.draw(); 
            
};

//reset filter data
function reset_filter () {
    show_players()
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
        show_players()
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
    var table = $('table').DataTable();
    table.draw(); 
    
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