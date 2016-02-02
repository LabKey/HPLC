/*
 * Copyright (c) 2014 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.hplc.UploadLog', {

    extend: 'Ext.panel.Panel',
    modelClass:'LABKEY.hplc.model.Uploads',

    initComponent : function() {

        if (!Ext4.ModelManager.isRegistered(this.modelClass)) {

            Ext4.define(this.modelClass, {
                extend: 'Ext.data.Model',

                fields: [
                    { name: 'fileName', type: 'string' },
                    { name: 'uploadFileURL', type: 'string' },
                    {
                        name: 'messages',
                        convert: function(raw) {
                            var value = [];

                            if (Ext4.isArray(raw)) {
                                value = raw;
                            }
                            else if (!Ext4.isEmpty(raw)) {
                                value.push(raw);
                            }

                            return value;
                        }
                    },
                    { name: 'uploadTime', type: 'date' }
                ],

                publishMessage : function(message) {
                    var oldMsgs = this.get("messages");
                    oldMsgs.push(message);
                    this.setCommit("messages", oldMsgs);
                },

                setCommit : function(fieldName, newValue) {
                    this.set(fieldName, newValue);
                    this.commit();
                }
            });
        }

        this.items = [ this.getGrid() ];

        this.resolvePipeline(function(context){
            this.fileSystem = Ext4.create('File.system.Webdav', {
                rootPath: context['webDavURL'],
                rootOffset:'HPLCassayData',
                rootName: 'fileset'
            });

            this.checkOrCreateWorkingFolder(this.fileSystem.concatPaths(this.fileSystem.getBaseURL(), 'Temp'), this);
            this.checkOrCreateWorkingFolder(this.getWorkingPath(), this);

        }, this);

        this.callParent();
    },

    getGrid : function() {
        if (!this._grid) {
            this._grid = Ext4.create('Ext.grid.Panel', {
                height: 300,
                store: this.getStore(),
                columns: this.getColumns()
            });
        }

        return this._grid;
    },

    getColumns : function() {
        return [
            {
                xtype: 'templatecolumn',
                text: 'File Name',
                width: 125,
                tpl: [
                    '<tpl if="uploadFileURL !== undefined && uploadFileURL.length &gt; 0">',
                    '<a href="{uploadFileURL}">{fileName:htmlEncode}</a>',
                    '<tpl else>',
                    //'<span>{uploadFileURL}</span>',

                    '<span>{fileName:htmlEncode}</span>',
                    '</tpl>'
                ]
            }, {
                text: 'Upload Time',
                dataIndex: 'uploadTime',
                renderer: Ext4.util.Format.dateRenderer('m/d/y g:i')
                , width: 150
            }
            , {
                xtype:'actioncolumn',
                width:20,
                items: [{
                    iconCls: 'iconDelete',
                    tooltip: 'Delete',
                    handler: function(grid, rowIndex, colIndex) {
                        var store = grid.getStore();
                        var row = store.getAt(rowIndex);
                        //Delete File
                        this.fileSystem.deletePath({
                            path: this.fileSystem.concatPaths(this.getFullWorkingPath(), row.get('fileName')),
                            isFile: true,
                            success: function(){
                                //remove from grid
                                store.removeAt(rowIndex);
                            }
                        });
                    },
                    scope: this
                }]
            }
        ];
    },

    getStore : function() {
        if (!this._store) {
            this._store = Ext4.create('Ext.data.Store', {
                model: this.modelClass,
                autoLoad: true,
                autoSync: true,
                proxy : {
                    type: 'sessionstorage',
                    id: 'pSizeProxy'
                }
            });

            // let the user see the most recent uploads at the top
            this._store.sort('uploadTime', 'DESC');
        }

        return this._store;
    },

    getModelInstance : function(config) {
        return Ext4.create(this.modelClass, config);
    },

    /**
     * Moves files from temp folder to target folder
     * Assumes: assay container as base.
     *
     * @param tempFolderName
     * @param targetFolder
     */
    commitRun: function(targetDirectory, callback, scope, params) {
        if (Ext4.isFunction(callback)) {
            var me = this;
            var destination = this.fileSystem.concatPaths(this.fileSystem.getBaseURL(),targetDirectory);
            this.fileSystem.renamePath({
                source: this.getWorkingPath(),
                destination: destination,
                isFile: false,
                success: function (fileSystem, path, records) {
                    me.resolveFileResources(destination, callback, scope, params);
                }
            }, this);
        }
    },

    resolveFileResources:function(targetDirectory, callback, callbackScope, callbackParams) {
        LABKEY.Ajax.request({
            url: this.fileSystem.getURI(targetDirectory),
            method: 'GET',
            params: {method: 'JSON'},
            success: function (response) {
                var json = Ext4.decode(response.responseText);
                if (Ext4.isDefined(json) && Ext4.isArray(json.files)) {
                    if (!Ext4.isEmpty(json.files)) {
                        this.resolveDataFileURL(json.files, callback, callbackScope, callbackParams);
                    }
                }
            },
            failure: function() {
            }
            ,scope:this
        }, this);
    },

    /**
     * will append a 'dataFileURL' property to all files resolved as resources
     */
    resolveDataFileURL: function(files, callback, scope, params) {
        if (Ext4.isFunction(callback)) {

            var received = 0;
            var newFiles = [];

            function done(file, results)
            {
                file['dataFileURL'] = results['DataFileUrl'];
                newFiles.push(file);
                received++;

                if (received == files.length) {
                    callback.call(scope || this, newFiles, params);
                }
            }

            files.forEach(function(file) {
                LABKEY.Ajax.request({
                    url: LABKEY.ActionURL.buildURL('hplc', 'getHPLCResource.api'),
                    method: 'GET',
                    params: { path: file.id, test: true },
                    success: function(response) {
                        done(file, Ext4.decode(response.responseText));
                    }
                });
            });
        }
    },

    resolvePipeline: function (callback, scope)
    {
        if (Ext4.isFunction(callback)) {
            Ext4.Ajax.request({
                url: LABKEY.ActionURL.buildURL('hplc', 'getHPLCPipelineContainer.api'),
                method: 'GET',
                success: function(response) {
                    var context = Ext4.decode(response.responseText);
                    if (Ext4.isObject(context) && !Ext4.isEmpty(context.containerPath) && !Ext4.isEmpty(context.webDavURL)) {
                        callback.call(scope || this, context);
                    }
                    else {
                        alert('Failed to load the pipeline context for Raw HPLC');
                    }
                },
                failure : function() {
                    alert('Failed to load the pipeline context for Raw HPLC');
                }
            });
        }
    },
    //Check if working folder exists
    checkOrCreateWorkingFolder: function (targetURL, scope) {
        LABKEY.Ajax.request({
            url: scope.fileSystem.getURI(targetURL),
            method: 'GET',
            params: {method: 'JSON'},
            success: function (response) {
                //Working directory exists
            },
            failure: function(b, xhr){
                //Working directory not found, create it.
                scope.fileSystem.createDirectory({
                    path: scope.fileSystem.getURI(targetURL),
                    success: function () {

                    },
                    failure: function () {
                        alert("Couldn't generate working directory");
                    }
                }, scope);
            }
        }, scope);
    },
    getWorkingPath: function(){
        return this.fileSystem.concatPaths(this.fileSystem.getBaseURL(), 'Temp/' + this.workingDirectory);
    },
    getFullWorkingPath: function(){
        return this.fileSystem.getURI(this.getWorkingPath());
    },
    workingDirectory:''

    ////TODO: add progress bar
    //, progressRenderer: function () {
    //    var b = new Ext.ProgressBar({height: 15});
    //    return function(progress) {
    //        b.updateProgress(progress);
    //        return Ext.DomHelper.markup(b.getRenderTree());
    //    };
    //}
    //
    //, progressRenderer: function (v, m, r) {
    //    //if(!r) return;
    //    //
    //    //var tmpValue = v / 100;
    //    //var tmpText = r.data.Data1 + ' / ' +r.data.Data2;
    //    //var renderer = (function (pValue, pText) {
    //    //    var b = new Ext.ProgressBar();
    //    //    return function(pValue, pText) {
    //    //        b.updateProgress(pValue, pText, true);
    //    //        return Ext.DomHelper.markup(b.getRenderTree());
    //    //    };
    //    //})(tmpValue, tmpText);
    //    //return renderer(tmpValue, tmpText);
    //}
});
