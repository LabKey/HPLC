package org.labkey.hplc.assay;

import org.jetbrains.annotations.Nullable;
import org.labkey.api.exp.api.DataType;
import org.labkey.api.study.assay.AbstractAssayTsvDataHandler;
import org.labkey.api.study.assay.AssayDataType;
import org.labkey.api.util.FileType;

/**
 * Created by Nick Arnold on 10/13/2015.
 */
public class HPLCAssayDataHandler extends AbstractAssayTsvDataHandler
{
    public static final String NAMESPACE = "HPLCAssayData";
    private static final AssayDataType DATA_TYPE = new AssayDataType(NAMESPACE, new FileType(".hplcmeta"));

    @Override
    protected boolean allowEmptyData()
    {
        return true;
    }

    @Override
    protected boolean shouldAddInputMaterials()
    {
        return false;
    }

    @Nullable
    @Override
    public DataType getDataType()
    {
        return DATA_TYPE;
    }
}
