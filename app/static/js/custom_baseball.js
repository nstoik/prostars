//Global Variables
var filter_items = ["Name", "Type", "Division", "Year", "Season", "League", "Gender"]

var player_table = null
var player_config = [
            {   "searchable": false,
                "orderable": false,
                "defaultContent": ""
            },
            {   name: "Name",
                data: "Name" },
            {   name: "Type",
                data: "Type" },
            {   name: "Division",
                data: "Division" },
            {   name: "Year",
                data: "Year" },
            {   name: "Season",
                data: "Season" },
            {   name: "League",
                data: "League" },
            {   name: "Gender",
                data: "Gender" },
            { data: "G" },
            { data: "H" },
            { data: "AB" },
            { data: "BB" },
            { data: "R" },
            { data: "1B" },
            { data: "2B" },
            { data: "3B" },
            { data: "HR" },
            { data: "RBI" },
            { data: "SAC" },
            { data: "AVG" },
            { data: "OBP" },
            { data: "SLG" },
            { data: "OPS" }
        ]

var pitcher_table = null
var pitcher_config = [
            {   "searchable": false,
                "orderable": false,
                "defaultContent": ""
            },
            {   name: "Name",
                data: "Name" },
            {   name: "Type",
                data: "Type" },
            {   name: "Division",
                data: "Division" },
            {   name: "Year",
                data: "Year" },
            {   name: "Season",
                data: "Season" },
            {   name: "League",
                data: "League" },
            {   name: "Gender",
                data: "Gender" },
            { data: "G" },
            { data: "GS" },
            { data: "IP" },
            { data: "W" },
            { data: "L" },
            { data: "T" },
            { data: "SV" },
            { data: "RA" },
            { data: "BB/7" },
            { data: "K/7" },
        ]

/*load the table with 'table_id'.
*This includes Datatables and Multiselect
*for each table
*/
function load_table(table_id) {
    dataSet = get_data(table_id)
    //if data was not available exit early while ajax fetches data
    if (dataSet === false) {
        return
    }
    //get correct config values
    switch(table_id) {
    case '#baseball-players-table':
        table_config = player_config;
        sort_order = [[ 19, 'desc' ]]
        break;
    case '#baseball-pitchers-table':
        table_config = pitcher_config;
        sort_order = [[ 9, 'desc' ]]
        break;
    default:
        alert('load_table() config switch error')
    }
    //have data. now setup
    var t = $(table_id).DataTable({
        scrollX: true,
        lengthChange: false,
        pageLength: 15,
        pagingType: "numbers",
        retrieve: true,
        dom: '<<t>ip>',
        fixedColumns:   {
            leftColumns: 2
        },
        "search": {
            "caseInsensitive": false
        },
        data: dataSet,
        columns: table_config,
        "order": sort_order,
        "language": {
            info: "_START_ to _END_ of _TOTAL_ entries",
            infoFiltered: " - filtered from _MAX_"
        }
    });

    //for rank column
    t.on( 'order.dt search.dt', function () {
        t.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        });
    }).draw();
    //store the table in the correct global variable
    switch(table_id) {
    case '#baseball-players-table':
        player_table = t;
        break;
    case '#baseball-pitchers-table':
        pitcher_table = t;
        break;
    default:
        alert('load_table() store switch error')
    }
    
    //now configure the multiselect filtering section
    for (var i = 0; i < filter_items.length; i++) {
        var columnName = filter_items[i].concat(':name')
        var multiselectData = t.column(columnName).data().sort().unique()
        //create the filter name from the table_id and filter_id
        filter_name = table_id.split("-table")[0].concat('-filter #',filter_items[i])
        button_name = filter_items[i]
        //load the filter
        load_filter(filter_name, multiselectData, button_name)
    }  
    apply_filter(table_id.substr(1).split("-table")[0].concat('-filter'))
}

/*load the filter for multiselect
*/
function load_filter (filter_name, filter_data, button_name) {
    //configure multiselect options
    $(filter_name).multiselect({
        maxHeight: 250,
        includeSelectAllOption: true,
        nSelectedText: button_name,
        numberDisplayed: 1,
        //this function is for the text on the buttons
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
    //add all options to the multiselect
    //sort days of week
    if (button_name == "Night") {
        days = ['Moday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        filter_data.sort(function (a,b) {return days.indexOf(a) > days.indexOf(b)})
    }
    var options = [];
    for (var i=0; i < filter_data.length; i++) {
        select_data = {}
        select_data['label'] = filter_data[i]
        select_data['title'] = filter_data[i]
        select_data['value'] = filter_data[i]
        select_data['selected'] = 'false'
        options.push(select_data)
    }
    $(filter_name).multiselect('dataprovider', options);
    if (button_name === "Year"){
        for (var i=0; i < filter_data.length - 1; i++) {
            $(filter_name).multiselect('deselect', filter_data[i])
        }
    }
    else if (button_name === "Season") {
        //set appropriate variables based on table_id
        switch(filter_name) {
        case '#baseball-players-filter #Season':
            session_data = 'baseball_player_data'
            break;
        case '#baseball-pitchers-filter #Season':
            session_data = 'baseball_pitcher_data'
            break;
        default:
            alert('load_filter() switch error')
        }
        data = JSON.parse(sessionStorage.getItem(session_data))
        last_season = data[data.length-1]['Season']
        for (var i=0; i < filter_data.length; i++) {
            if(!(last_season === filter_data[i])) {
                $(filter_name).multiselect('deselect', filter_data[i])
            }
        }
    }
}

/*get the data for a given table
*Data is in sessionStorage
*If data is expired, or not present, load_default
*is called to fetch from server
*/
function get_data (table_id) {
    //set appropriate variables based on table_id
    switch(table_id) {
    case '#baseball-players-table':
        session_data = 'baseball_player_data'
        session_timestamp = 'baseball_player_timestamp'
        break;
    case '#baseball-pitchers-table':
        session_data = 'baseball_pitcher_data'
        session_timestamp = 'baseball_pitcher_timestamp'
        break;
    default:
        alert('get_data() switch error')
    }
    //check if data and timestamp is in sessionStorage
    if (!(session_data in sessionStorage && session_timestamp in sessionStorage)) {
        //something is missing so fetch all data
        load_default(table_id)
        //return early to allow async of data fetch
        return false
    }
    //else check timestamp to see if data is still valid
    //add 15 minutes to timestamp
    var timestamp = new Date(JSON.parse(sessionStorage.getItem(session_timestamp)) + 15*60000);
    now = new Date();

    if (now > timestamp){
        //data is outdated so fetch again
        load_default(table_id)
        return false
    }
    //all checks are good
    //we already have the data. Just return data
    return JSON.parse(sessionStorage.getItem(session_data))
}
/*load data for table_id from server
*load_table is called for the table_id after finishing
*/
function load_default (table_id) {
    switch(table_id) {
    case '#baseball-players-table':
        session_data = 'baseball_player_data'
        session_timestamp = 'baseball_player_timestamp'
        break;
    case '#baseball-pitchers-table':
        session_data = 'baseball_pitcher_data'
        session_timestamp = 'baseball_pitcher_timestamp'
        break;
    default:
        alert('load_default() switch error')
    }
    $.ajax({
        url: '/stats/baseball/load_default/',
        data: { 
        'table_id': table_id
        },
        type: 'POST',
        beforeSend: function(){
            loading.showLoading();
        },
        complete: function(){
            loading.hideLoading();
        },
        success : function(data) {
            //store data in sessionStorage and set a timestamp
            sessionStorage.setItem(session_timestamp, JSON.stringify(new Date().getTime()))
            sessionStorage.setItem(session_data, JSON.stringify(data.row_data))           
            //load table. This always needs to be done in the success callback.      
            load_table(data.table_id);
        },
        error : function(xhr, statusText, error) { 
            alert("Error! Could not retrieve the data " + error);
        }
    });
}


//reset filter data
function reset_filter (filter_id) {
    //get the  table
    switch(filter_id) {
    case 'baseball-players-filter':
        table = player_table;
        break;
    case 'baseball-pitchers-filter':
        table = pitcher_table;
        break;
    default:
        alert('apply_filter() switch error')
    }
    //now configure the multiselect filtering section
    for (var i = 0; i < filter_items.length; i++) {
        var columnName = filter_items[i].concat(':name')
        var multiselectData = table.column(columnName).data().sort().unique()
        //create the filter name from the filter_id
        filter_name = "#".concat(filter_id, ' #', filter_items[i])
        button_name = filter_items[i]
        //load the filter
        load_filter(filter_name, multiselectData, button_name)
    }  
    apply_filter(filter_id)
};

//apply the filter choices to the table
function apply_filter (filter_id ){
    var applied_filters = []
    for (var i = 0; i < filter_items.length; i++) {
        var select_name = filter_items[i]
        var selectedOptionValue = $("#"+filter_id+" #" + select_name + " option:selected")
        //make sure at least one option is selected
        if (selectedOptionValue.length == 0) {
            alert("You need to select at least one item for: " + select_name)
            return false
        }
        //gather the options selected
        var single_filter = {
            'item_name': select_name,
            'selected_options' : []
        }
        for (var j = 0; j < selectedOptionValue.length; j++) {
            single_filter.selected_options.push(selectedOptionValue[j].value)
        }
        applied_filters.push(single_filter)
    }
    //if there are no filters to apply, exit
    if (applied_filters.length == 0) {
        return
    }
    //filter the rows
    //get the interm table
    switch(filter_id) {
    case 'baseball-players-filter':
        interm_table = player_table;
        break;
    case 'baseball-pitchers-filter':
        interm_table = pitcher_table;
        break;
    default:
        alert('apply_filter() switch error')
    }

    //build the search string
    for (var i = 0; i < applied_filters.length; i++){
        var search_column_name = applied_filters[i].item_name.concat(':name')
        var search_column_string = '(^'.concat(applied_filters[i].selected_options[0])
        for(var x = 1; x < applied_filters[i].selected_options.length; x++) {
            search_column_string = search_column_string.concat('$|^')
            search_column_string = search_column_string.concat(applied_filters[i].selected_options[x])
        }
        search_column_string = search_column_string.concat('$)')
        //apply the search string to the table
        interm_table = interm_table.column(search_column_name).search(search_column_string, true, false)
    }
    //draw the table with the new searches applied
    interm_table.draw()
    
};

function tab_switch(targeted_tab) {
    var table_id = targeted_tab.concat('-table')
    if( !$.fn.DataTable.isDataTable(table_id) ) {
        console.log('need to load: ' + table_id)
        load_table(table_id)
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