/*
 * Copyright (c) 2014 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Created by Nick Arnold on 9/26/2014.
 */
Ext4.define('LABKEY.hplc.DataService', {

    alternateClassName: ['HPLCService'],

    singleton: true,

    _ContentCache: {},
    _PipelineCache: undefined,
    _AssayTypeCache: {},

    FileContentCache : function(expData /* LABKEY.Exp.Data */, callback, scope) {
        if (expData instanceof LABKEY.Exp.Data)
        {
            var path = expData['pipelinePath'];

            var content = this._ContentCache[path];
            if (content)
            {
                if (Ext4.isFunction(callback))
                    callback.call(scope || this, content);
            }
            else
            {
                expData.getContent({
                    format: 'jsonTSV',
                    success: function (c)
                    {
                        this._ContentCache[path] = c;
                        if (Ext4.isFunction(callback))
                            callback.call(scope || this, c);
                    },
                    failure: function (error)
                    {
                        alert('Failed to Load File Contents');
                    },
                    scope: this
                });
            }
        }
        else {
            console.error('LABKEY.hplc.QualityControl.FileContentCache: invalid expData object. Must be of type LABKEY.Exp.Data');
        }
    },

    /**
     * Retrieves the data from a file response object
     * @param datacontent
     * @param xleft
     * @param xright
     * @param mod - if not specified it will not be used
     * @returns {Array}
     */
    getData : function(datacontent, xleft, xright, mod) {
        var data = [];
        if (datacontent) {
            var _data = datacontent.sheets[0].data;
            _data.shift(); // get rid of column headers
            var newData = [], d, xy;

            //
            // check modulus
            //
            if (!mod || !Ext4.isNumber(mod)) {

                //
                // check for bounds
                //
                if (xleft == 0 && xright == 0) {
                    for (d=0; d < _data.length; d++) {
                        xy = _data[d][0].split(' ');
                        xy[0] = parseFloat(xy[0]);
                        xy[1] = parseFloat(xy[1]);
                        newData.push(xy);
                    }
                }
                else {
                    //
                    // using bounds
                    //
                    for (d=0; d < _data.length; d++) {
                        xy = _data[d][0].split(' ');
                        xy[0] = parseFloat(xy[0]);
                        xy[1] = parseFloat(xy[1]);
                        if (xy[0] > xleft && xy[0] < xright)
                            newData.push(xy);
                    }
                }
            }
            else {
                //
                // check for bounds
                //
                if (xleft == 0 && xright == 0) {
                    for (d=0; d < _data.length; d++) {
                        if (d%mod == 0) {
                            xy = _data[d][0].split(' ');
                            xy[0] = parseFloat(xy[0]);
                            xy[1] = parseFloat(xy[1]);
                            newData.push(xy);
                        }
                    }
                }
                else {
                    //
                    // using bounds
                    //
                    for (d=0; d < _data.length; d++) {
                        if (d%mod == 0) {
                            xy = _data[d][0].split(' ');
                            xy[0] = parseFloat(xy[0]);
                            xy[1] = parseFloat(xy[1]);
                            if (xy[0] > xleft && xy[0] < xright)
                                newData.push(xy);
                        }
                    }
                }
            }

            data = newData;
        }
        return data;
    },

    /**
     * Use this to retrieve all the required information with regards to the given provisional HPLC assay runId
     * @param runId
     * @param schemaName,
     * @param callback
     * @param scope
     */
    getRun : function(schema, runId, callback, scope) {

        var context = {
            RunId: runId
        }, _count = 0;

        var loader = function() {
            _count++;
            if (_count == 4) {

                //
                // Load the expected batch/run
                //
                LABKEY.Experiment.loadBatch({
                    assayId: context.AssayDefinition.id,
                    batchId: context.RunDefinition.Batch.value,
                    success: function(RunGroup) {
                        context.batch = RunGroup;

                        //
                        // Transform select rows result into a structure the Ext store can accept
                        //
                        var d = [];
                        var runs = RunGroup.runs, runIdentifier, run;

                        //
                        // Find the associated run
                        //
                        for (var r=0; r < runs.length; r++) {
                            if (runs[r].id == context.RunId) {
                                runIdentifier = runs[r].name;
                                run = runs[r];
                                break;
                            }
                        }

                        for (r=0; r < run.dataRows.length; r++) {
                            var name = run.dataRows[r]['Name'].split('.');
                            var fileExt = name[1];
                            name = name[0];
                            var filePath = "";
                            var dataFile = run.dataRows[r]['DataFile'];
                            filePath = context.pipe + "/" + runIdentifier + "/" + dataFile;

                            //
                            // Link the associated LABKEY.Exp.Data object (the data file)
                            //
                            var ExpDataRun;
                            for (var i=0; i < run.dataInputs.length; i++) {
                                if (run.dataInputs[i].name == dataFile) {
                                    ExpDataRun = run.dataInputs[i];
                                }
                            }

                            d.push({
                                name: name,
                                fileExt: fileExt,
                                filePath: filePath,
                                expDataRun: ExpDataRun
                            });
                        }

                        context.rawInputs = d;

                        if (Ext4.isFunction(callback)) {
                            callback.call(scope || this, context);
                        }
                    },
                    scope: this
                });
            }
        };

        //
        // Get the associated HPLC configuration
        //
        this.getPipelineConfiguration(function(data) {
            context.pipe = data.webDavURL; loader();
        }, this);

        //
        // Get the associated Assay information
        //
        this.getAssayDefinition('Provisional HPLC', function(def) {
            context.AssayDefinition = def; loader();
        }, this);

        //
        // Get the associated HPLC Assay information
        //
        this.getAssayDefinition('HPLC', function(def) {
            context.HPLCDefinition = def; loader();
        }, this);

        //
        // Get the associated Batch information
        //
        this.getBatchDefinition(schema, context.RunId, function(def) {
            context.RunDefinition = def; loader();
        }, this);
    },

    getPipelineConfiguration : function(callback, scope) {
        if (Ext4.isObject(this._PipelineCache)) {
            if (Ext4.isFunction(callback)) {
                callback.call(scope || this, Ext4.clone(this._PipelineCache));
            }
        }
        else {
            Ext4.Ajax.request({
                url: LABKEY.ActionURL.buildURL('hplc', 'getHPLCPipelineContainer.api'),
                success: function(response) {
                    this._PipelineCache = Ext4.decode(response.responseText);
                    if (Ext4.isFunction(callback)) {
                        callback.call(scope || this, Ext4.clone(this._PipelineCache));
                    }
                },
                scope: this
            });
        }
    },

    getAssayDefinition : function(assayType /* String */, callback, scope) {
        if (Ext4.isString(assayType)) {
            if (Ext4.isObject(this._AssayTypeCache[assayType])) {
                if (Ext4.isFunction(callback)) {
                    callback.call(scope || this, this._AssayTypeCache[assayType]);
                }
            }
            else {
                LABKEY.Assay.getByType({
                    type: assayType,
                    success: function(defs) {
                        this._AssayTypeCache[assayType] = defs[0];
                        if (Ext4.isFunction(callback)) {
                            callback.call(scope || this, this._AssayTypeCache[assayType]);
                        }
                    },
                    scope: this
                });
            }
        }
    },

    getBatchDefinition : function(assaySchema /* String */, runId /* Number */, callback, scope) {
        LABKEY.Query.selectRows({
            schemaName: assaySchema,
            queryName: 'Runs',
            requiredVersion: 13.2,
            filterArray: [ LABKEY.Filter.create('RowId', runId) ],
            success: function(data) {
                if (Ext4.isFunction(callback)) {
                    callback.call(scope || this, data.rows[0]); // LABKEY.Query.Row
                }
            },
            scope: this
        });
    },

    getDate : function(filePath) {
        var date;

        if (!Ext4.isEmpty(filePath)) {
            var path = filePath.split('/');

            var folder = "";
            if (path.length == 1) {
                folder = path[0]; // allows for the folder name to be handed in directly
            }
            else {
                folder = path[path.length-2];
            }

            if (folder.indexOf('20') == 0) {
                folder = folder.split('_');
                date = new Date();
                date.setDate(parseInt(folder[2])); // setDay
                date.setFullYear(parseInt(folder[0]));
                date.setMonth(parseInt(folder[1])-1);
                date.setHours(parseInt(folder[3]));
                date.setMinutes(parseInt(folder[4]));
                date.setSeconds(parseInt(folder[5]));
            }
        }

        if (!Ext4.isDefined(date)) {
            Ext4.Msg.alert('Invalid Date requested for:', filePath);
        }

        return date;
    }
});
