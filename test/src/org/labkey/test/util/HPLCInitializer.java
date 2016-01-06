package org.labkey.test.util;

import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;
import org.labkey.test.TestFileUtils;
import org.labkey.test.WebDriverWrapper;

/**
 * Created by Nick Arnold on 1/5/2016.
 */
public class HPLCInitializer
{
    private final BaseWebDriverTest _test;
    private final String _project;

    public static final String RAW_HPLC_ASSAY = "RawHPLC";
    public static final String RAW_HPLC_DESC = "HPLC Raw Assay Data";

    public static final String RAW_HPLC_PIPELINE_PATH = TestFileUtils.getSampleData("rawHPLC").getPath();
    public static final String RAW_HPLC_ASSAY_METADATA =
            "<tables xmlns=\"http://labkey.org/data/xml\">\n" +
            "   <table tableName=\"Data\" tableDbType=\"NOT_IN_DB\">\n" +
            "       <columns>\n" +
            "           <column columnName=\"WrappedRowId\" wrappedColumnName=\"RowId\">\n" +
            "               <fk>\n" +
            "                   <fkDbSchema>assay.rawHPLC.RawHPLC</fkDbSchema>\n" +
            "                   <fkTable>SearchHPLCData</fkTable>\n" +
            "                   <fkColumnName>RowId</fkColumnName>\n" +
            "               </fk>\n" +
            "           </column>\n" +
            "       </columns>\n" +
            "   </table>\n" +
            "</tables>";

    public HPLCInitializer(BaseWebDriverTest test, String projectName)
    {
        _test = test;
        _project = projectName;
    }

    @LogMethod
    public void setupProject()
    {
        _test._containerHelper.createProject(_project, "Assay");
        _test._containerHelper.enableModule(_project, "HPLC");

        defineRawHPLCAssay();
        overrideRawHPLCMetadata();
        uploadRawHPLCData();

        _test.goToProjectHome();
    }

    @LogMethod
    private void defineRawHPLCAssay()
    {
        _test.goToProjectHome();

        _test.log("Defining Raw HPLC Assay");
        _test.clickAndWait(Locator.linkWithText("Manage Assays"));
        _test.clickButton("New Assay Design");

        _test.assertTextPresent("Raw HPLC");
        _test.checkCheckbox(Locator.radioButtonByNameAndValue("providerName", "Raw HPLC"));
        _test.clickButton("Next");

        _test.waitForElement(Locator.xpath("//input[@id='AssayDesignerName']"), _test.WAIT_FOR_JAVASCRIPT);
        _test.setFormElement(Locator.xpath("//input[@id='AssayDesignerName']"), RAW_HPLC_ASSAY);
        _test.setFormElement(Locator.xpath("//textarea[@id='AssayDesignerDescription']"), RAW_HPLC_DESC);
        _test.fireEvent(Locator.xpath("//input[@id='AssayDesignerName']"), WebDriverWrapper.SeleniumEvent.blur);

        // Make Runs/Results editable
        _test.checkCheckbox(Locator.checkboxByName("editableRunProperties"));
        _test.checkCheckbox(Locator.checkboxByName("editableResultProperties"));

        _test.clickButton("Save", 0);
        _test.waitForText(10000, "Save successful.");
        _test.clickButton("Save & Close");

        _test.setPipelineRoot(RAW_HPLC_PIPELINE_PATH);
    }

    @LogMethod
    private void overrideRawHPLCMetadata()
    {
        _test.beginAt("/" + _project + "/query-schema.view?schemaName=assay.rawHPLC.RawHPLC&queryName=Data");
        _test.waitForText(10000, "edit metadata");
        _test.clickAndWait(Locator.linkWithText("edit metadata"));
        _test.waitForText(10000, "Label");
        _test.clickButton("Edit Source", _test.WAIT_FOR_PAGE);
        _test._extHelper.clickExtTab("XML Metadata");
        _test.setCodeEditorValue("metadataText", RAW_HPLC_ASSAY_METADATA);
        _test.clickButton("Save", 0);
        _test.waitForElement(Locator.id("status").withText("Saved"), _test.WAIT_FOR_JAVASCRIPT);
    }

    @LogMethod
    private void uploadRawHPLCData()
    {
        _test.beginAt("/" + _project + "/hplc-mockHPLCWatch.view");
        _test.waitForText("Ready to Load");
        _test.click(Locator.tagWithClass("input", "hplc-run-btn"));
        _test.waitForText("Test Run Upload Complete");
        _test.sleep(1500);
    }
}
