/**
 * Created by iansigmon on 1/20/16.
 */
(function() {
    Ext4.QuickTips.init();

    var setWorkingDirectory = function() {
        var dir = 'TEMP_HPLC_' + getRunFolderName();
        sessionStorage.hplcWorkingDirectory = dir;
        return dir;
    };

    var getTempFolderName = function() {
        if (!sessionStorage.hplcWorkingDirectory)
            setWorkingDirectory();
        return sessionStorage.hplcWorkingDirectory;
    };

    var getRunFolderName = function() {
        var now = new Date();
        var parts = [now.getFullYear(), now.getMonth() + 1 /*javascript uses 0 based month*/,
                now.getDate(), now.getHours(),now.getMinutes(),now.getSeconds()]

        return parts.join('_');
    };

    var uploadLog = Ext4.create('LABKEY.hplc.UploadLog', {
        region: 'center',
        id:'uploadLog-dropzone',
        workingDirectory: getTempFolderName(),
        flex:2
    });

    var clearCachedReports = function(callback, scope) {
        uploadLog.getStore().removeAll();
        uploadLog.getStore().sync();
        form.getForm().reset();

        //delete contents of working folder
        uploadLog.fileSystem.deletePath({
            path: uploadLog.getFullWorkingPath(),
            isFile: false,
            success:callback,
            scope: scope
        });
    };

    var dropzone; var form;
    var init = function() {

        var getAssayForm = function() {
            return {
                xtype:'form',
                title:'Run Fields',
                id: 'hplc-run-form',
                items: getAssayFormFields(),
                border: false,
                layout:'vbox',
                shrinkWrap:true,
                shrinkWrapDock:true,
                buttonAlign:'center',
                buttons: [
                    {
                        //Add a reset button
                        xtype:'button',
                        text: 'Clear Run',
                        cls: 'labkey-button',
                        id: 'clearBtn',
                        handler: function () {
                            clearCachedReports(function () {
                                uploadLog.workingDirectory = setWorkingDirectory();
                                //Recreate working dir
                                uploadLog.checkOrCreateWorkingFolder(uploadLog.getWorkingPath(), uploadLog);
                            }, this);
                        }
                    }, {
                        //Add a Save button
                        xtype:'button',
                        text: 'Save Run',
                        cls: 'labkey-button',
                        id: 'saveBtn',
                        formBind:true,
                        handler: function () {
                            var form = this.up('form').getForm();

                            if(uploadLog.getStore().getCount() == 0)
                            {
                                showNoFilesError();
                            }
                            else if (form.isValid()) {
                                closeRun(form);
                            }
                        }
                    }
                ],

                collapsible: false,
                region: 'west',
                width:'25%',
                minWidth: 280,
                minHeight:300,
                flex: 1
            };
        };

        var dropInit = function(){
            dropzone = LABKEY.internal.FileDrop.registerDropzone({
                url: LABKEY.ActionURL.buildURL("assay", "assayFileUpload"),
                uploadMultiple: false,
                maxFiles: 5000,
                // Allow uploads of 100GB files
                maxFilesize: 100*(1024*1024),

                peer: function() {
                    // Get the grid component from the outer Browser component
                    var grid = uploadLog.getGrid();
                    return grid ? grid.el : uploadLog.ownerCt.el;
                },

                /**
                 * If the user is allowed to drop
                 * @param file
                 * @param done
                 */
                accept: function(file, done) {
                    // Filter out folder drag-drop on unsupported browsers (Firefox)
                    // See: https://github.com/enyo/dropzone/issues/528
                    if ( (!file.type && file.size == 0 && file.fullPath == undefined)) {
                        done("Drag-and-drop upload of folders is not supported by your browser. Please consider using Google Chrome or an external WebDAV client.");
                        return;
                    }

                    done();
                },

                init: function(){

                    this.on('processing', function (file) {
                        var cwd = uploadLog.getFullWorkingPath();
                        if (cwd) {
                            var uri = uploadLog.fileSystem.concatPaths(cwd, file.fullPath ? file.fullPath : file.name);

                            // Folder the file will be POSTed into
                            var folderUri = uploadLog.fileSystem.getParentPath(uri);
                            this.options.url = folderUri;
                        }

                        //Add entry to uploadLog
                        var process = uploadLog.getModelInstance({
                            uploadTime: new Date(),
                            fileName: file.name
                        });
                        process = uploadLog.getStore().add(process)[0];
                        file.workingId = process.get('id');
                        uploadLog.getStore().sync();

                        //Update inprogress tracker
                        processingCounter.value++;
                        form.isValid();
                    });

                    //Update file progress bar
                    this.on('uploadprogress',function(file, progress, bytesSent){
                        var model = uploadLog.getStore().getById(file.workingId);
                        model.set('progress', progress);
                    });

                    //Update inprogress tracker
                    this.on('success', function(file, response, evt) {
                        processingCounter.value--;
                        form.isValid();
                    });
                },
                show: !(uploadLog.getStore().getCount() > 0)
            });

            this.dropzone = dropzone;
            dropzone.uploadPanel = uploadLog;
            dropzone.form = form;
        };

        form = Ext4.create('Ext.form.Panel', {
            renderTo: 'upload-run-form',
            tempFolder: getTempFolderName(),
            layout: 'border',
            height:300,
            border: false,
            bodyStyle: 'background-color: transparent;',
            items: [
                getAssayForm(),
                uploadLog
            ],
            listeners: {
                actioncomplete: function (_form, action, eOpts) {
                    var process = uploadLog.getModelInstance({
                        uploadTime: new Date(),
                        fileName: action.result.name
                    });

                    uploadLog.getStore().add(process);
                    uploadLog.getStore().sync();
                },
                actionfailed: function (_form, action, eOpts) { alert("Server Failed"); },

                //TODO: Resize
                //afterrender: function() {
                //    Ext4.defer(function () {
                //        var size = Ext4.getBody().getBox();
                //        this.resize.call(this, size.width, size.height);
                //    }, 300, this);
                //}
            }

            //TODO: Resize
            //resize : function(w,h) {
            //        LABKEY.ext4.Util.resizeToViewport(this, w, h, 46, 32);
            //}
        });


        //TODO: Resize
        //Ext4.EventManager.onWindowResize(form.resize, form);

        window.onbeforeunload = function(){
            if(form.isDirty() || uploadLog.getStore().getCount() > 0) {
                return 'Unsaved changes will be lost. Continue?';
            }
        };

        window.onunload = function(){
            clearCachedReports();
            sessionStorage.hplcWorkingDirectyory = undefined;
        };

        var drop = dropInit();
    };

    var processingCounter = Ext4.create('Ext.form.field.Hidden', {
        xtype:'hidden',
        validate: function(){
            return this.value === 0;
        },
        validateOnChange:true,
        value: 0
    });

    var getAssayFormFields = function() {

        var assay = LABKEY.page.assay;

        var batchFields = assay.domains[assay.name + ' Batch Fields'];
        var runFields = assay.domains[assay.name + ' Run Fields'];

        var configs = getConfigs(runFields);

        configs.push(processingCounter);

        return configs;
    };

    var showNoFilesError = function(){
        alert('Please add run result file(s)');
    };

    var getConfigs = function(fields) {
        if (!fields || fields.length == 0)
            return [];

        var configs = [];
        fields.forEach(function(metaField){
            configs.push(getExtConfig(metaField));
        },this);

        return configs;
    };

    var getExtConfig = function(meta) {
        setLookupConfig(meta);
        var config = LABKEY.ext4.Util.getFormEditorConfig(meta
        );
        config.id = config.name;

        return config;
    };

    var setLookupConfig = function(meta) {
        // the getDefaultEditorConfig code in util.js expects a lookup object, so create one here
        // if our metadata has lookup information
        if (meta.lookupQuery && meta.lookupSchema && !meta.lookup)    {
            meta.lookup = {
                container : meta.lookupContainer,
                schemaName : meta.lookupSchema,
                queryName : meta.lookupQuery
            };
        }
    };

    var closeRun = function(form) {
        var fieldValues = form.getFieldValues();
        var runFolder = getRunFolderName();

        uploadLog.commitRun(runFolder, generateAndSaveRun, this, fieldValues);
    };

    function saveRun(run) {
        var assay = LABKEY.page.assay;

        LABKEY.Experiment.saveBatch({
            assayId: assay.id,
            batch: {
                batchProtocolId: assay.id,
                runs: [{
                    "name": run.name,
                    "properties": run.properties,
                    "dataRows": run.dataRows,
                    "dataInputs": run.dataInputs
                }]
            },
            success: function(batch) {
                clearCachedReports(function(){
                    uploadLog.workingDirectory = setWorkingDirectory();
                    window.location = LABKEY.ActionURL.buildURL("assay", "assayRuns", LABKEY.ActionURL.getContainer(), LABKEY.ActionURL.getParameters());
                },this);
            }
        }, this);
    }

    var generateAndSaveRun = function(files, fieldValues){

        var run = new LABKEY.Exp.Run({
            name: getRunFolderName(),
            properties: fieldValues
        });

        var dataRows = [];
        var dataInputs = [];

        files.forEach(function(resultFile) {
            dataRows.push({
                Name: resultFile.text,
                DataFile: resultFile.text,
                TestType: 'SMP'
            });
            dataInputs.push({
                name: resultFile.text,
                dataFileURL: resultFile.dataFileURL
            });
        });

        run.dataRows = dataRows;
        run.dataInputs = dataInputs;
        saveRun(run);
    };

    Ext4.onReady(init);
})();