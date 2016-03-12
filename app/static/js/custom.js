//Global Variables
var filter_items = ["Name", "Type", "Division", "Year", "Season", "Night", "Gender"]

function load_filter (filter_name, filter_data) {
    select_id = $('#' + filter_name)
    //configure multiselect options
    $(select_id).multiselect({
        maxHeight: 250,
        includeSelectAllOption: true,
        nSelectedText: filter_name,
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
    var options = [];
    for (var i=0; i < filter_data.length; i++) {
        select_data = {}
        select_data['label'] = filter_data[i]
        select_data['title'] = filter_data[i]
        select_data['value'] = filter_data[i]
        select_data['selected'] = 'true'
        options.push(select_data)
    }
    $(select_id).multiselect('dataprovider', options);
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
            //store data in sessionStorage and set a timestamp
            sessionStorage.setItem('player_timestamp', JSON.stringify(new Date().getTime()))
            sessionStorage.setItem('player_data', JSON.stringify(data.row_data))                      
            //load table. This always needs to be done in the succes callback
            load_table();
        },
        error : function(xhr, statusText, error) { 
            alert("Error! Could not retrieve the data " + error);
        }
    });
}
function get_data () {
    //check if data and timestamp is in sessionStorage
    if (!('player_data' in sessionStorage && 'player_timestamp' in sessionStorage)) {
        //something is missing so fetch all data
        load_default()
        //return early to allow async of data fetch
        return false
    }
    //else check timestamp to see if data is still valid
    //add 15 minutes to timestamp
    var timestamp = new Date(JSON.parse(sessionStorage.getItem('player_timestamp')) + 15*60000);
    now = new Date();

    if (now > timestamp){
        //data is outdated so fetch again
        load_default()
        return false
    }
    //all checks are good
    //we already have the data. Just return player data
    return JSON.parse(sessionStorage.getItem('player_data'))
}

function load_table() {
    dataSet = get_data()
    //if data was not available exit early while ajax fetches data
    if (dataSet === false) {
        return
    }
    //have data. now setup
    var t = $('table').DataTable({
        scrollX: true,
        searching: false,
        lengthChange: false,
        pageLength: 15,
        pagingType: "numbers",
        retrieve: true,
        dom: '<<t>ip>',
        fixedColumns:   {
            leftColumns: 2
        },
        data: dataSet,
        columns: [
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
            {   name: "Night",
                data: "Night" },
            {   name: "Gender",
                data: "Gender" },
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
    //now configure the multiselect filtering section
    for (var i = 0; i < filter_items.length; i++) {
        var columnName = filter_items[i].concat(':name')
        var multiselectData = t.column(columnName).data().sort().unique()
        load_filter(filter_items[i], multiselectData)
    }  
}

//reset filter data
function reset_filter () {
    show_players()
};

//apply the filter choices to the table
function apply_filter () {
    var applied_filters = []
    for (var i = 0; i < filter_items.length; i++) {
        var select_name = filter_items[i]
        var selectedOptionValue = $("#" + select_name + " option:selected")
        
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
    console.log(applied_filters)

    // DataTable
    var table = $('table').DataTable();
    console.log(table)
 
    // Apply the search
    
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