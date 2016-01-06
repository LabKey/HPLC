/*
 * Copyright (c) 2014 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.hplc.QualityControl', {
    extend: 'Ext.panel.Panel',

    layout: 'card',

    minWidth: 650,

    height: 700,

    initComponent : function() {

        this.items = [];

        this.callParent();

        this.getRunContext(function(context) {
            this.loadContext(context);
        }, this);
    },

    loadContext : function(context) {
        this.context = context;
        this.add(this.getSampleCreator());
    },

    getStandardCreator : function() {
        if (!this.stdCreator) {
            this.stdCreator = Ext4.create('LABKEY.hplc.StandardCreator', {
                context: this.context,
                listeners: {
                    complete: function() {
                        this.getLayout().setActiveItem(this.getSampleCreator());
                    },
                    scope: this
                },
                scope: this
            });
        }
        return this.stdCreator;
    },

    getSampleCreator : function() {
        if (!this.sampleCreator) {
            this.sampleCreator = Ext4.create('LABKEY.hplc.SampleCreator', {
                context: this.context,
                listeners: {
                    requeststandards: function() {
                        this.getLayout().setActiveItem(this.getStandardCreator());
                    },
                    scope: this
                },
                scope: this
            });
        }
        return this.sampleCreator;
    },

    getRunContext : function(callback, scope) {
        LABKEY.DataRegion.getSelected({
            selectionKey: LABKEY.ActionURL.getParameter('selectionKey'),
            success: function(runSelection) {
                LABKEY.Query.selectRows({
                    schemaName: LABKEY.ActionURL.getParameter('schemaName'),
                    queryName: 'Data',
                    requiredVersion: 13.2,
                    filterArray: [ LABKEY.Filter.create('RowId', runSelection.selected.join(';'), LABKEY.Filter.Types.IN) ],
                    success: function(result) {
                        var runs = [];
                        var dataNames = [];
                        if (result.rows.length > 0) {
                            for (var r = 0; r < result.rows.length; r++) {
                                runs.push(result.rows[r]['Run/Links'].value);
                                dataNames.push(result.rows[r]['Name'].value);
                            }
                        }
                        HPLCService.getRun(LABKEY.ActionURL.getParameter('schemaName'), runs, callback, scope, dataNames);
                    },
                    scope: this
                });
            },
            scope: this
        });
    }
});
