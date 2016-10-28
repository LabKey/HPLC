/*
 * Copyright (c) 2015-2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.hplc.SpectrumPlot', {

    extend: 'Ext.Component',

    alias: 'widget.spectrum',

    colors: ['#00FE00', '#0100FE', '#FC01FC', '#ff0000'],

    yLabel: '',

    xLabel: '',

    leftRight: [0, 30],

    lowHigh: [0, 1200],

    id: Ext4.id(),

    height: '100%',

    autoEl: {
        tag: 'div'
    },

    autoZoom: false,

    highlight: undefined,

    constructor : function(config) {
        this.callParent([config]);
        this.addEvents('zoom');
    },

    clearPlot : function() {
        Ext4.get(this.id).update('');
    },

    renderPlot : function(contents) {

        if (!contents) {
            if (!this._lastContent) {
                console.error(this.$className + '.renderPlot requires contents be provided at least once');
                return;
            }
            contents = this._lastContent;
        }

        var layers = [];
        var colors = this.colors;

        var xleft = this.leftRight[0], xright = this.leftRight[1],
                low = this.lowHigh[0], high = this.lowHigh[1];

        var c=0, isHighlight = false, useHighlight = (this.highlight ? true : false), color;
        for (var i=0; i < contents.length; i++) {
            //
            // create point layer
            //
            color = colors[c%colors.length];

            if (useHighlight) {
                isHighlight = (this.highlight === contents[i].fileName);

                if (!isHighlight) {
                    color = '#A09C9C';
                }
            }

            var pointLayer = new LABKEY.vis.Layer({
                data: HPLCService.getData(contents[i], xleft, xright, 2),
                aes: {
                    x: function(r) { return r[0]; },
                    y: function(r) { return r[1]; }
                },
                geom: new LABKEY.vis.Geom.Path({
                    color: color
                })
            });
            c++;

            layers.push(pointLayer);
        }

        this.update('');

        var box = this.getBox();

        var width = box.width;
        var height = box.height - 30;

        var me = this;

        var plot = new LABKEY.vis.Plot({
            renderTo: this.id,
            rendererType: 'd3',
            width: width,
            height: height,
            layers: layers,
            legendPos: 'none',
            labels: {
                x: {value: this.xLabel},
                y: {value: this.yLabel}
            },
            scales: {
                x: { domain: [xleft, xright] },
                y: { domain: [low, high] }
            },
            brushing: {
                brush: function() {}, /* required due to bug in brushing API */
                brushend: function(e, d, extent, ls) {
                    var left = extent[0][0];
                    var right = extent[1][0];
                    var bottom = extent[0][1];
                    var top = extent[1][1];
                    me.updateZoom(left, right, bottom, top);
                }
            }
        });

        this._lastContent = contents;
        plot.render();
    },

    setHighlight : function(highlight) {
        this.highlight = highlight;
    },

    resetZoom : function() {
        this.leftRight = [0, 30];
        this.lowHigh = [0, 1200];
        if (this._lastContent) {
            this.renderPlot();
        }
    },

    updateZoom : function(left, right, bottom, top) {
        if (this.autoZoom) {
            this.leftRight = [left, right];
            this.lowHigh = [bottom, top];
            this.renderPlot();
        }
        this.fireEvent('zoom', left, right, bottom, top);
    }
});