/*
 * Copyright (c) 2015-2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
if (!LABKEY.hplc) {
    LABKEY.hplc = {};
}

LABKEY.hplc.hplcSelection = function(dataRegion, dataRegionName) {
    window.location = LABKEY.ActionURL.buildURL('hplc', 'qc', null, {
        selectionKey: dataRegion.selectionKey,
        queryName: dataRegion.queryName,
        schemaName: dataRegion.schemaName
    });
};