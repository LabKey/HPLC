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
                HPLCService.getRun(LABKEY.ActionURL.getParameter('schemaName'), runSelection.selected, callback, scope);
            },
            scope: this
        });
    }
});
