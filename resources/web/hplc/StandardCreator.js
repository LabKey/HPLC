/*
 * Copyright (c) 2015-2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.hplc.StandardCreator', {

    extend: 'Ext.panel.Panel',

    title: 'Define Standards',

    layout: 'border',

    border: false, frame: false,

    statics: {
        standardsStore : undefined,
        getStandardsStore : function(context) {
            if (!LABKEY.hplc.StandardCreator.standardsStore) {
                LABKEY.hplc.StandardCreator.standardsStore = Ext4.create('LABKEY.ext4.data.Store', {
//                   model: 'LABKEY.hplc.Standard',
                    schemaName: 'lists',
                    queryName: 'HPLCStandard',
                    filterArray: [
                        LABKEY.Filter.create('provisionalRun', context.RunId)
                    ]
                });
                LABKEY.hplc.StandardCreator.standardsStore.load();
            }
            return LABKEY.hplc.StandardCreator.standardsStore;
        },
        getSourcesStore : function(doFilter, standardKey) {

            if (!Ext4.isNumber(standardKey)) {
                standardKey = -1;
            }

            var filters = [ LABKEY.Filter.create('standard/Key', standardKey) ];

            if (!LABKEY.hplc.StandardCreator.sourcesStore) {
                LABKEY.hplc.StandardCreator.sourcesStore = Ext4.create('LABKEY.ext4.data.Store', {
//                   model: 'LABKEY.hplc.StandardSource',
                    schemaName: 'lists',
                    queryName: 'HPLCStandardSource'
                });
            }

            if (doFilter) {
                LABKEY.hplc.StandardCreator.sourcesStore.filterArray = filters;
                LABKEY.hplc.StandardCreator.sourcesStore.load();
            }
            return LABKEY.hplc.StandardCreator.sourcesStore;
        }
    },

    initComponent : function() {

        SC = this;
        this.loadContext(this.context);

        this.items = [
            this.getInputs(), // west
            this.getDefinitionForm(), // east
            this.getStandardsDisplay() // center
        ];

        this.callParent();

        this.on('selectsource', this.onSelectSource, this);
        this.on('standardsave', this.onStandardSave, this);

        this.pTask = new Ext4.util.DelayedTask(function() {
            if (Ext4.isArray(this.definitions)) {
                this.renderCalibrationStandards(this.definitions);
            }
        }, this);
    },

    plotTask : function() {
        this.pTask.delay(500);
    },

    loadContext : function(context) {
        this.rawInputs = context.rawInputs;
    },

    getInputs : function() {

        return {
            xtype: 'panel',
            itemId: 'west',
            region: 'west',
            width: 250,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [{
                title: 'Choose a Standard to Define',
                id: 'inputsgrid',
                xtype: 'grid',
                height: 400,
                store: {
                    xtype: 'store',
                    model: 'LABKEY.hplc.StandardSource',
                    data: this.rawInputs
                },
                selModel: {
                    selType: 'checkboxmodel',
                    mode: 'MULTI'
                },
                columns: [{text: 'Inputs', dataIndex: 'name', flex: 1}],
                hideHeaders: true,

                // listeners
                listeners: {
                    viewready : function(g) {
                        g.getStore().filter([{
                            filterFn: function(item) {
                                return item.get('name').indexOf('PRE_') == -1 && item.get('name').indexOf('POST_') == -1;
                            }
                        },{
                            filterFn: function(item) {
                                return item.get('name').indexOf('BLANK') == -1;
                            }
                        },{
                            filterFn: function(item) {
                                return item.get('name').indexOf('QF') == -1;
                            }
                        },{
                            filterFn: function(item) {
                                return item.get('name').indexOf('QD') == -1;
                            }
                        },{
                            filterFn: function(item) {
                                return item.get('name').indexOf('QG') == -1;
                            }
                        }]);
                    },
                    selectionchange: function(g, selects) {
                        this.fireEvent('selectsource', selects);
                    },
                    scope: this
                },
                scope: this
            },{
                title: 'Standards Previously Defined',
                xtype: 'grid',
                itemId: 'standardsgrid',
                height: 200,
                store: LABKEY.hplc.StandardCreator.getStandardsStore(this.context),
                columns: [
                    {text: 'Inputs', dataIndex: 'Name', flex: 3}
                ],
                hideHeaders: true,
                emptyText: 'No Standards Defined',
                listeners: {
                    select: this.onLoadStandard,
                    scope: this
                },
                scope: this
            }],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [{
                    text: 'Return to Samples',
                    handler: function() {
                        this.clearCalibrationCurve();
                        this.clearStandardViewer();
                        this.fireEvent('complete');
                    },
                    scope: this
                }]
            }],
            scope: this
        };
    },

    /**
     * Called when a used clicks to select a pre-defiend standard
     * @param grid
     * @param standard
     */
    onLoadStandard : function(grid, standard) {

        //
        // Clear calibration curve
        //
        this.clearCalibrationCurve();

        //
        // Clear the selected sources
        //
        var sourcesGrid = this.getComponent('west').getComponent('inputsgrid');
        sourcesGrid.getSelectionModel().deselectAll();

        //
        // Load the set of standard 'sources'
        //
        if (standard) {

            this.getStandardsDisplay().getEl().mask('Loading Definitions...');

            var store = LABKEY.hplc.StandardCreator.getSourcesStore(true, standard.get('Key'));
            store.on('load', function(s) {
                // merge the 'sources' data to the inputs data
                var inputsStore = sourcesGrid.getStore();
                var sources = s.getRange(), i = 0, r, s, sels = [];

                var left = null;
                var right = 0;
                var bottom = null;

                for (; i < sources.length; i++) {
                    s = sources[i];
                    r = inputsStore.findExact('name', s.get('name'));
                    if (r > -1) {
                        r = inputsStore.getAt(r);

                        r.set('auc', s.get('auc'));
                        r.set('concentration', s.get('concentration'));
                        r.set('peakMax', s.get('peakMax'));

                        r.set('xleft', s.get('xleft'));
                        if (left == null) {
                            left = s.get('xleft');
                        }
                        else {
                            left = Math.min(left, s.get('xleft'));
                        }

                        r.set('xright', s.get('xright'));
                        right = Math.max(right, s.get('xright'));

                        r.set('base', s.get('base'));
                        if (bottom == null) {
                            bottom = s.get('base');
                        }
                        else {
                            bottom = Math.min(bottom, s.get('base'));
                        }

                        sels.push(r);
                    }
                }

                Ext4.getCmp('calibrateleft').setValue(left);
                Ext4.getCmp('calibrateright').setValue(right);
                Ext4.getCmp('calibratebottom').setValue(Math.max(0, bottom-5));

                this.on('standardsrendered', function() {
                    //
                    // Show the calibration curve
                    //
                    this.generateCalibrationCurve();

                    //
                    // Re-bound the chart
                    //
                }, this, {single: true});
                sourcesGrid.getSelectionModel().select(sels);

                //
                // Update definition form
                //
                Ext4.getCmp('standardname').setValue(standard.get('Name'));
                Ext4.getCmp('isupdate').setValue(standard.get('Name'));
                Ext4.getCmp('deletestandardbtn').show();
            }, this, {single: true});
        }
    },

    /**
     * Called when a use clicks to select a standard source
     * @param grid
     * @param source
     */
    onSelectSource : function(grid, source) {
        var standardsGrid = this.getComponent('west').getComponent('standardsgrid');
        standardsGrid.getSelectionModel().deselectAll();

        this.clearCalibrationCurve();
        Ext4.getCmp('deletestandardbtn').hide();
    },

    /**
     * Fired when a user saves a standard
     */
    onStandardSave : function() {
        LABKEY.hplc.StandardCreator.getStandardsStore(this.context).load();
    },

    getDefinitionForm : function() {

        var view = Ext4.create('Ext.view.View', {
            id: 'definitionformview',
            store: LABKEY.hplc.StandardCreator.getSourcesStore(),
            itemSelector: 'tr.item',
            autoScroll: true,
            height: 305,
            tpl: new Ext4.XTemplate(
                '<table style="width: 100%;">',
                    '<tr>',
                        '<th style="text-align: left;">Name</th>',
                        '<th style="text-align: left;">Conc</th>',
                        '<th style="text-align: left;">Left</th>',
                        '<th style="text-align: left;">Right</th>',
                        '<th style="text-align: left;">Base</th>',
                        '<th style="text-align: left;"></th>',
                    '</tr>',
                    '<tpl for=".">',
                        '<tr class="item" modelname="{name}">',
                            '<td>{name}</td>',
                            '<td><input value="{concentration}" placeholder="µg/ml" name="concentration" style="width: 50px;"/></td>',
                            '<td><input value="{xleft}" placeholder="xleft" name="xleft" style="width: 40px;"/></td>',
                            '<td><input value="{xright}" placeholder="xright" name="xright" style="width: 40px;"/></td>',
                            '<td><input value="{base}" name="base" style="width: 40px;"/></td>',
                            '<td><button title="copy">C</button></td>',
                        '</tr>',
                    '</tpl>',
                '</table>'
            ),
            listeners: {
                itemclick: function(view,model,z,a,evt) {
                    if (evt.target && Ext4.isString(evt.target.tagName) && evt.target.tagName.toLowerCase() === "button") {
                        Ext4.Msg.show({
                            msg: 'Copy \'' + model.get('name') + '\' (xleft, right, base) to all other selections?',
                            buttons: Ext4.Msg.YESNO,
                            icon: Ext4.window.MessageBox.INFO,
                            fn: function(b) {
                                if (b === 'yes') {
                                    this.commitSources();
                                    var store = LABKEY.hplc.StandardCreator.getSourcesStore();

                                    var models = store.getRange(),
                                            n = model.get('name'),
                                            xl = model.get('xleft'),
                                            xr = model.get('xright'),
                                            base = model.get('base');

                                    Ext4.each(models, function(m) {
                                        if (m.name !== n) {
                                            m.set('xleft', xl);
                                            m.set('xright', xr);
                                            m.set('base', base);
                                        }
                                    });
                                }
                            },
                            scope: this
                        });
                    }
                    else {
                        // for some reason, focus is not maintained even after a user clicks an input
                        Ext4.defer(function() { Ext4.get(evt.target).dom.focus(); }, 50);
                    }
                },
                select: function(view, source) {
                    this.highlighted = source.get('name') + '.' + source.get('fileExt');
                    this.plotTask();
                    this.on('standardsrendered', function() { this.highlighted = undefined; }, this, {single: true});
                },
                scope: this
            },
            scope: this
        });

        this.on('selectsource', function(selects) { view.getStore().loadData(selects); }, this);

        return {
            xtype: 'panel',
            title: 'Standard Definitions',
            region: 'east',
            width: 400,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            border: false, frame: false,
            style: 'border-left: 1px solid lightgrey;',
            items: [{
                xtype: 'box',
                id: 'stdcurveplot',
                height: 250,
                autoEl: {
                    tag: 'div'
                }
            },{
                id: 'stddefform',
                xtype: 'form',
                width: '100%',
                border: false,
                frame: false,
                padding: '5 0 0 3',
                defaults: {
                    labelSeparator: ''
                },
                items: [{
                    id: 'standardname',
                    xtype: 'textfield',
                    name: 'standardname',
                    fieldLabel: 'Standard Name',
                    allowBlank: false,
                    validateOnBlur: false
                },{
                    id: 'standardrsquared',
                    name: 'rsquared',
                    xtype: 'displayfield',
                    fieldLabel: 'R²'
                },{
                    id: 'isupdate',
                    xtype: 'hidden',
                    name: 'isupdate'
                }]
            },view],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [{
                    text: 'Calibration Curve',
                    handler : this.generateCalibrationCurve,
                    scope: this
                },{
                    text: 'Save',
                    handler: this.saveStandard,
                    scope: this
                },{
                    id: 'deletestandardbtn',
                    text: 'Delete',
                    hidden: true,
                    handler: this.onRequestDelete,
                    scope: this
                },{
                    text: 'Clear Highlight',
                    handler: function() {
                        this.highlighted = undefined;
                        this.plotTask();
                    },
                    scope: this
                }]
            }]
        }
    },

    saveStandard : function() {
        //
        // Ensure that the calibration curve is up to date
        //
        this.on('calibration', function(R) {

            var form = Ext4.getCmp('stddefform');
            if (form && form.isValid()) {

                var store = Ext4.getCmp('definitionformview').getStore();

                // Y = B0 + B1*X + B2*X^2
                var standardRow = {
                    'Name': Ext4.getCmp('standardname').getValue(),
                    'provisionalRun': parseInt(this.context.RunId),
                    'b0': R.equation[0],
                    'b1': R.equation[1],
                    'b2': R.equation[2],
                    'rsquared': R.rSquared,
                    'error': R.stdError
                };

                //
                // First save the standard information
                // Lists.HPLCStandard
                //
                LABKEY.Query.saveRows({
                    commands: [{
                        command: 'insert',
                        schemaName: 'lists',
                        queryName: 'HPLCStandard',
                        rows: [standardRow]
                    }],
                    success: function(data) {

                        //
                        // Second save the standard sources
                        //
                        var sourceRows = [];
                        var sources = store.getRange(), s;

                        for (var i=0; i < sources.length; i++) {
                            s = sources[i];
                            sourceRows.push({
                                'standard': data.result[0].rows[0].Key,
                                'name': s.get('name'),
                                'concentration': s.get('concentration'),
                                'auc': s.get('auc'),
                                'peakMax': s.get('peakMax'),
                                'xleft': s.get('xleft'),
                                'xright': s.get('xright'),
                                'base': s.get('base'),
                                'fileName': s.get('fileName') || (s.get('name') + '.' + s.get('fileExt')),
                                'filePath': s.get('filePath'),
                                'fileExt': s.get('fileExt')
                            });
                        }

                        LABKEY.Query.saveRows({
                            commands: [{
                                command: 'insert',
                                schemaName: 'lists',
                                queryName: 'HPLCStandardSource',
                                rows: sourceRows
                            }],
                            success: function(data) { this.fireEvent('standardsave'); },
                            failure: function() {
                                alert('Failed to Save HPLCStandardSource');
                            },
                            scope: this
                        });
                    },
                    failure: function() {
                        alert('Failed to Save HPLCStandard: ' + standardRow['Name']);
                    },
                    scope: this
                });

            }

        }, this, {single: true});

        this.generateCalibrationCurve();
    },

    onRequestDelete : function() {
        Ext4.Msg.show({
            title: 'Delete Standard Definition',
            modal: true,
            msg: 'Are you sure you want to delete this standard?',
            icon: Ext4.window.MessageBox.INFO,
            buttons: Ext4.Msg.OKCANCEL,
            fn : function(btn) {
                if (btn === "ok") {
                    var store = LABKEY.hplc.StandardCreator.getStandardsStore();
                    var realName = Ext4.getCmp('isupdate').getValue();

                    if (realName.length > 0) {
                        var idx = store.findExact('Name', realName);
                        if (idx > -1) {
                            var standard = store.getAt(idx);
                            this.deleteStandard(standard.get('Key'));
                        }
                    }
                }
            },
            scope: this
        });
    },

    deleteStandard : function(key) {

        LABKEY.Query.selectRows({
            schemaName: 'lists',
            queryName: 'HPLCStandard',
            filterArray: [ LABKEY.Filter.create('Key', key) ],
            success: function(d) {
                if (d.rows.length == 1) {

                    //
                    // Delete sources
                    //
                    LABKEY.Query.selectRows({
                        schemaName: 'lists',
                        queryName: 'HPLCStandardSource',
                        filterArray: [ LABKEY.Filter.create('standard', key) ],
                        success: function(sd) {
                            if (sd.rows.length > 0) {
                                LABKEY.Query.deleteRows({
                                    schemaName: 'lists',
                                    queryName: 'HPLCStandardSource',
                                    rows: sd.rows,
                                    success: function() { },
                                    failure: function() { alert('Failed to cleanup Lists.HPLCStandardSource'); }
                                });
                            }
                        },
                        scope: this
                    });

                    //
                    // Delete Standard
                    //
                    LABKEY.Query.deleteRows({
                        schemaName: 'lists',
                        queryName: 'HPLCStandard',
                        rows: d.rows,
                        success: function() {
                            this.clearCalibrationCurve();
                            this.clearStandardViewer();
                            //
                            // Clear the selected sources
                            //
                            var sourcesGrid = this.getComponent('west').getComponent('inputsgrid');
                            sourcesGrid.getSelectionModel().deselectAll();
                            Ext4.getCmp('calibrationform').getForm().reset();
                        },
                        failure: function() { alert('Failed to cleanup Lists.HPLCStandard'); },
                        scope: this
                    });

                }
                else {
                    alert('Unable to find exact run.');
                }
            },
            scope: this
        });
    },

    getStandardsDisplay : function() {

        if (!this.standardsdisplay) {
            this.standardsdisplay = Ext4.create('Ext.panel.Panel', {
                xtype: 'panel',
                title: 'Standards Viewer',
                region: 'center',
                border: false, frame: false,
                items: [{
                    id: 'calibrationform',
                    xtype: 'form',
                    border: false, frame: false,
                    items: [{
                        xtype: 'fieldcontainer',
                        fieldLabel: 'Bounds',
                        layout: 'hbox',
                        items: [{
                            xtype: 'numberfield',
                            width: 75,
                            id: 'calibrateleft',
                            emptyText: 'Left',
                            hideTrigger: true,
                            listeners: {
                                change: this.plotTask,
                                scope: this
                            }
                        },{
                            xtype: 'splitter'
                        },{
                            xtype: 'numberfield',
                            width: 75,
                            id: 'calibrateright',
                            emptyText: 'Right',
                            hideTrigger: true,
                            listeners: {
                                change: this.plotTask,
                                scope: this
                            }
                        },{
                            xtype: 'splitter'
                        },{
                            xtype: 'numberfield',
                            width: 75,
                            id: 'calibratebottom',
                            emptyText: 'Bottom',
                            hideTrigger: true,
                            listeners: {
                                change: this.plotTask,
                                scope: this
                            }
                        },{
                            xtype: 'splitter'
                        },{
                            xtype: 'numberfield',
                            width: 75,
                            id: 'calibratetop',
                            emptyText: 'Top',
                            hideTrigger: true,
                            listeners: {
                                change: this.plotTask,
                                scope: this
                            }
                        }],
                        scope: this
                    }]
                },{
                    xtype: 'box',
                    id: 'stdplot',
                    height: '100%',
                    autoEl: {
                        tag: 'div'
                    }
                }]
            });

            this.on('selectsource', function(defs) {
                this.definitions = defs;
                this.plotTask();
            }, this);
        }

        return this.standardsdisplay;
    },

    requestContent : function(def, callback, scope) {
        var sd = def.get('expDataRun');
        if (sd) {
            HPLCService.FileContentCache(sd, callback, scope);
        }
        else {
            console.error('failed to load expDataRun from definition.');
        }
    },

    renderCalibrationStandards : function(definitions) {

        this.definitions = definitions;
        var expected = definitions.length, received = 0;
        var contentMap = {};

        var done = function(content) {
            received++;
            contentMap[content.fileName] = content;
            if (received == expected) {
                //
                // render the plot
                //
                var layers = [];
                var colorSet = ['#00FE00', '#0100FE', '#FC01FC', '#ff0000'], c=0;
                var useHighlight = (this.highlighted ? true : false), isHighlight = false;
                var xleft = Ext4.getCmp('calibrateleft').getValue();
                var xright = Ext4.getCmp('calibrateright').getValue();
                var bottom = Ext4.getCmp('calibratebottom').getValue();
                var top = Ext4.getCmp('calibratetop').getValue();

                if (!Ext4.isNumber(bottom)) {
                    bottom = 0;
                }

                if (!Ext4.isNumber(top)) {
                    top = null;
                }

                if (!xleft) {
                    xleft = 0;
                }
                if (!xright) {
                    xright = 0;
                }

                var hold = null;
                for (var filename in contentMap) {
                    if (contentMap.hasOwnProperty(filename)) {
                        //
                        // create point layer
                        //
                        isHighlight = (this.highlighted === filename);
                        var pointLayer = new LABKEY.vis.Layer({
                            data: HPLCService.getData(contentMap[filename], xleft, xright, 3),
                            aes: {
                                x: function(r) { return r[0]; },
                                y: function(r) { return r[1]; }
                            },
                            geom: new LABKEY.vis.Geom.Path({
                                color: useHighlight ? (isHighlight ? colorSet[c%colorSet.length] : '#A09C9C') : colorSet[c%colorSet.length]
                            })
                        });
                        c++;

                        if (isHighlight) {
                            hold = pointLayer;
                        }
                        else {
                            layers.push(pointLayer);
                        }
                    }
                }

                if (hold) {
                    layers.push(hold);
                }

                if (!this.plotbox) {
                    this.plotbox = Ext4.get('stdplot').getBox();
                }
                this.clearStandardViewer();

                var plot = new LABKEY.vis.Plot({
                    renderTo: 'stdplot',
                    rendererType: 'd3',
                    width: this.plotbox.width,
                    height: this.plotbox.height - 30,  // offset due to top pane
                    margins: {top: 10},
                    clipRect: true,
                    layers: layers,
                    labels: {
                        x: {value: 'Time (m)'},
                        y: {value: 'mV'}
                    },
                    scales: {
                        y: { domain: [bottom, top] }
                    },
                    legendPos: 'none'
                });

                this.getStandardsDisplay().getEl().unmask();
                plot.render();
                this.fireEvent('standardsrendered');
            }
        };

        for (var d=0; d < definitions.length; d++) {
            this.requestContent(definitions[d], done, this);
        }
    },

    generateCalibrationCurve : function() {
        var store = Ext4.getCmp('definitionformview').getStore();

        this.curveConfig = {
            contentMap: {},
            expected: store.getCount(),
            received: 0
        };

        for (var d=0; d < store.getCount(); d++) {
            this.requestContent(store.getAt(d), this._processContent, this);
        }
    },

    commitSources : function() {
        var itemNodes = Ext4.DomQuery.select('.item');
        var store = Ext4.getCmp('definitionformview').getStore();

        for (var n=0; n < itemNodes.length; n++) {
            var node = Ext4.get(itemNodes[n]);
            var modelname = node.getAttribute('modelname');
            var idx = store.findExact('name', modelname);
            if (idx > -1) {
                var model = store.getAt(idx);
                model.set('concentration', this._parseFloat(node, 'input[name=concentration]'));
                model.set('xleft', this._parseFloat(node, 'input[name=xleft]'));
                model.set('xright', this._parseFloat(node, 'input[name=xright]'));
                model.set('base', this._parseFloat(node, 'input[name=base]'));
            }
        }
    },

    _parseFloat : function(node, selector) {
        return parseFloat(Ext4.get(node.select(selector).elements[0]).getValue());
    },

    _processContent : function(content) {

        if (Ext4.isObject(this.curveConfig)) {
            this.curveConfig.received++;
            this.curveConfig.contentMap[content.fileName] = content;

            if (this.curveConfig.expected === this.curveConfig.received) {

                //
                // have content
                //
                this.commitSources();

                //
                // All models are updated
                //
                var store = Ext4.getCmp('definitionformview').getStore();
                var data, n, m, fname, count = store.getCount();
                for (n=0; n < count; n++) {
                    m = store.getAt(n);
                    fname = m.get('expDataRun').name;
                    data = HPLCService.getData(this.curveConfig.contentMap[fname], m.get('xleft'), m.get('xright'));
                    var aucPeak = LABKEY.hplc.Stats.getAUC(data, m.get('base'));
                    m.set('auc', aucPeak.auc);
                    m.set('peakMax', aucPeak.peakMax);
                }

                data = []; // final array of points containing conc, peak area
                for (n=0; n < count; n++) {
                    var rec = store.getAt(n);
                    data.push([rec.get('concentration'), rec.get('auc')]);
                }

                this.renderCalibrationCurve(data);
                this.curveConfig = null;
            }
        }
        else {
            alert('Processing failed. Invalid curve configuration.');
        }
    },

    renderCalibrationCurve : function(data) {
        var R = LABKEY.hplc.Stats.getPolynomialRegression(data);
        var eq = R.equation;
        R.reverseString = 'y = ' + eq[0].toFixed(2) + ' + ' + eq[1].toFixed(2) + 'x ';
        R.reverseString += (eq[2] < 0 ? '- ' : '+ ');
        R.reverseString += Math.abs(eq[2].toFixed(2)) + 'x²';

        Ext4.getCmp('standardrsquared').setValue(R.rSquared);
        var getY = function(x) { return (eq[2] * Math.pow(x, 2)) + (eq[1] * x) + eq[0]; };

        var pointLayer = new LABKEY.vis.Layer({
            data: data,
            aes: {
                x: function(r) { return r[0]; },
                y: function(r) { return r[1]; }
            },
            geom: new LABKEY.vis.Geom.Point({
                size: 2,
                color: '#FF0000'
            })
        });

        var pathLayer = new LABKEY.vis.Layer({
            geom: new LABKEY.vis.Geom.Path({
                color: '#0000FF'
            }),
            data: LABKEY.vis.Stat.fn(getY, 100, 1, 100),
            aes: {x: 'x', y: 'y'}
        });

        this.clearCalibrationCurve();

        var plot = new LABKEY.vis.Plot({
            renderTo: 'stdcurveplot',
            rendererType: 'd3',
            width: 400,
            height: 250,
            clipRect: false,
            labels: {
                main: {value: R.reverseString},
                x: {value: 'Concentration (µg/ml)'},
                y: {value: 'Response (mV.s)'}
            },
            layers: [ pointLayer, pathLayer ],
            legendPos: 'none',
            scales: {
                x: { domain: [0, null] },
                y: { domain: [0, null] }
            }
        });

        plot.render();
        this.fireEvent('calibration', R);
    },

    clearCalibrationCurve : function() {
        var el = Ext4.get('stdcurveplot');
        el.update('');
    },

    clearStandardViewer : function() {
        Ext4.get('stdplot').update('');
    }
});
