function messageViewer(channel)
{
    var parent = this;

    function sanitize(str) { return str.replace(" ", "_"); }

    function uiResizePanel(event, ui)
    {
        resizePanel(ui.size.height);
    }

    function resizePanel(height)
    {
        var padding = $("#message-viewer-" + parent.c +
                        " .panel-heading").height() +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .panel-heading").css("padding-top"), 10) +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .panel-heading").css("padding-bottom"), 10) +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .message-viewer-content").css("padding-bottom"), 10) +
                      parseInt($("#message-viewer-" + parent.c).css("margin-bottom"), 10) - 4;

        // this accounts for some lag in the ui.size value, if you take this away
        // you'll get some instable behaviour
        $("#message-viewer-" + parent.c).height(height);

        // set the content panel width
        // $("#message-viewer-" + parent.c +
        //   " .message-viewer-content").height(height - padding);
    }

    this.updateViewer = function(msg, utime)
    {
        for (var f in msg)
            this.updateField(this.c + f, msg[f], utime);
    }

    this.updateField = function(prefix, field, utime)
    {
        var type = $.type(field);
        switch(type) {

            case 'object':
                for (var f in field)
                    this.updateField(prefix + f, field[f], utime);
                break;

            case 'array':
                for (var i = 0; i < field.length; ++i) {
                    this.updateField(prefix + i, field[i], utime);
                }
                break;

            case 'number':
                if (!(prefix in this.graphFieldIdx)) {
                    var chart = new SmoothieChart({interpolation:'linear',
                                                   grid:{fillStyle:'#ffffff',
                                                         strokeStyle:'#ebebeb'},
                                                   labels:{disabled:true}});
                    var line = new TimeSeries();

                    var canvas = document.getElementById(prefix + "-graph");
                    chart.streamTo(canvas);
                    chart.addTimeSeries(line, {lineWidth:1,
                                               strokeStyle:'#000000'});

                    this.graphFieldIdx[prefix] = this.graphs.length;
                    this.graphs.push({});
                    this.graphs[this.graphFieldIdx[prefix]]["graph"] = chart;
                    this.graphs[this.graphFieldIdx[prefix]]["line"] = line;
                }

                this.graphs[this.graphFieldIdx[prefix]]["line"].append(new Date().getTime(), Number(field));
                // Intentionally no "break;"
            default:
                $("#message-viewer-" + this.c + " .message-viewer-content #" + prefix).text(field);
                break;
        }
    }

    this.__proto__ = new panel();

    this.createPanel = function(msg)
    {
        var wrapper = $('<div />', {'class' : 'col-xs-1 message-viewer'});

        var body = $('<div />', { 'class' : 'content' });
        delete msg["__type"];
        delete msg["__hash"];
        body.jsonView(msg, { collapsed : true }, parent.c);

        var header = $('<div />', { 'class' : 'channel' }).text(parent.channel);

        var panel = parent.__proto__.createPanel(header, body);

        wrapper.append(panel);

        return wrapper;
    }

    this.hidePanel = function()
    {
        $('#' + parent.__proto__.panelId + ' .content').css('visibility', 'hidden');
    }

    this.showPanel = function()
    {
        $('#' + parent.__proto__.panelId + ' .content').css('visibility', 'visible');
    }

    this.graphs = [];
    this.graphFieldIdx = {};
    this.c = sanitize(channel);
    this.channel = channel;
    this.closed = false;
}
