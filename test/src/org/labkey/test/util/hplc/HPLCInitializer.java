/*
 * Copyright (c) 2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.labkey.test.util.hplc;

import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;
import org.labkey.test.TestFileUtils;
import org.labkey.test.WebDriverWrapper;
import org.labkey.test.util.LogMethod;

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
    private void uploadRawHPLCData()
    {
        _test.beginAt("/" + _project + "/hplc-mockHPLCWatch.view");
        _test.waitForText("Ready to Load");
        _test.click(Locator.tagWithClass("input", "hplc-run-btn"));
        _test.waitForText("Test Run Upload Complete");
        _test.sleep(1500);
    }
}
