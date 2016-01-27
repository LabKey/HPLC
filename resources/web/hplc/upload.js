/**
 * Created by iansigmon on 1/20/16.
 */
(function() {

    var clearCachedReports = function(runName) {
        //TODO: delete contents of working folder
    };

    var RUN_FOLDER_NAME = 'myTestFolderName';

    var tempFolder = null;
    var getTempFolderName = function() {
        if(!tempFolder)
            tempFolder = RUN_FOLDER_NAME;

        return tempFolder;
    };

    var uploadLog = Ext4.create('LABKEY.hplc.UploadLog', {
        region: 'center',
        layout: 'fit',
        id:'uploadLog-dropzone',
        workingDirectory: getTempFolderName()
    });


    var dropzone; var form;
    var init = function() {

        var getAssayForm = function() {
            return {
                xtype:'form',
                items: getAssayFormFields(),
                collapsible: false,
                region: 'west',
                width:'30%',
                height:200,
                minWidth: 300,
                minHeight: 200
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
                        if (cwd)
                        {
                            var uri = uploadLog.fileSystem.concatPaths(cwd, file.fullPath ? file.fullPath : file.name);

                            // Folder the file will be POSTed into
                            var folderUri = uploadLog.fileSystem.getParentPath(uri);
                            this.options.url = folderUri;
                        }
                    });

                    this.on('success', function(file, response, evt) {
                        var process = uploadLog.getModelInstance({
                            uploadTime: new Date(),
                            fileName: file.name
                        });
                        uploadLog.getStore().add(process);
                        uploadLog.getStore().sync();
                    });
                },
                show: !(uploadLog.getStore().getTotalCount() > 0)
            });

            this.dropzone = dropzone;
            dropzone.uploadPanel = uploadLog;
        };

        form = Ext4.create('Ext.form.Panel', {
            renderTo: 'upload-run-form',
            tempFolder: getTempFolderName(),
            //url: LABKEY.ActionURL.buildURL("assay", "assayFileUpload", getTempFolderName()),
            layout: 'border',
            height:200,
            border: false,
            bodyStyle: 'background-color: transparent',
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
                actionfailed: function (_form, action, eOpts) { alert("Server Failed"); }
            },
        });

        var drop = dropInit();
    };

    //
    //var equalsIgnoresCase = function(str1, str2) {
    //    return str1.toLowerCase() == str2.toLowerCase();
    //};
    //
    //var copyWorkingSet = function(workingSet, run) {
    //    for (var i=0; i<WORKING_SET_SIZE; i++)
    //    {
    //        workingSet[i].ExtractionNumber = i + 1;
    //        run.dataRows.push(workingSet[i]);
    //    }
    //};

    var getAssayFormFields = function() {

        var assay = LABKEY.page.assay;

        var batchFields = assay.domains[assay.name + ' Batch Fields'];
        var runFields = assay.domains[assay.name + ' Run Fields'];

        var configs = getConfigs(runFields);

        //Add a reset button
        configs.push(
            Ext4.create('Ext.Button',{
                text: 'Clear Run',
                handler: function() {
                    //TODO: Clear form fields

                    uploadLog.getStore().removeAll();
                    uploadLog.getStore().sync();

                    //TODO: delete temp uploads
                    clearCachedReports(getTempFolderName());
                }
            })
        );

        //Add a submit button
        configs.push(
                Ext4.create('Ext.Button',{
                    text: 'Submit Run',
                    handler: function() {
                        var form = this.up('form').getForm();

                        if (form.isValid()) {
                            closeRun(form);
                        }
                    }
                })
        );
        return configs;
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
        var config = LABKEY.ext4.Util.getFormEditorConfig(meta);
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
        var runFolder = fieldValues["RunIdentifier"];

        //TODO: move files from temp upload dir to runDir
        var files = uploadLog.commitFiles(runFolder, generateAndSaveRun, this, fieldValues);

        //TODO: generate run object
        //var run = generateAndSaveRun(runFolder, fieldValues, files);
        //saveRun(LABKEY.page.assay, run);
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
                writeStatus("Run Upload Complete");

                //TODO: Clear form?
                //TODO: return to HPLC page?
            }
        }, this);
    }

    var generateAndSaveRun = function(files, fieldValues){

        var run = new LABKEY.Exp.Run({
            name: fieldValues['RunIdentifier'],
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