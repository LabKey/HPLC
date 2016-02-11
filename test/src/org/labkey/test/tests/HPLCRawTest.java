/*
 * Copyright (c) 2011-2015 LabKey Corporation
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
package org.labkey.test.tests;

import org.jetbrains.annotations.Nullable;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.experimental.categories.Category;
import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;
import org.labkey.test.TestFileUtils;
import org.labkey.test.categories.HPLC;
import org.labkey.test.pages.HPLCAssayBeginPage;
import org.labkey.test.pages.HPLCUploadPage;
import org.labkey.test.util.DataRegionTable;
import org.labkey.test.util.Ext4Helper;
import org.labkey.test.util.HPLCInitializer;
import org.junit.Assert;

import java.io.File;
import java.util.Collections;
import java.util.List;

@Category({HPLC.class})
public class HPLCRawTest extends BaseWebDriverTest
{
    private static final String PROJECT_NAME = "HPLCRawTest";
    private static final String SAMPLE_DATA_LOC = "rawHPLC/HPLCassayData/TestRun001";
    private static final String SAVE_BUTTON = "Save Run";
    private static final String CLEAR_BUTTON = "Clear Run";

    @Nullable
    @Override
    protected final String getProjectName()
    {
        return PROJECT_NAME;
    }

    @Override
    public List<String> getAssociatedModules()
    {
        return Collections.singletonList("HPLC");
    }

    @Override
    public BrowserType bestBrowser()
    {
        return BrowserType.CHROME;
    }

    @BeforeClass
    public static void doSetup() throws Exception
    {
        HPLCRawTest test = (HPLCRawTest) getCurrentTest();
        HPLCInitializer _initializer = new HPLCInitializer(test, test.getProjectName());
        _initializer.setupProject();
    }

    @Test
    public void testRunsSearch()
    {
        //Navigate to import page
        navigateToAssayLandingPage();

        File[] files = TestFileUtils.getSampleData(SAMPLE_DATA_LOC).listFiles();
        File testFile = files[3];

        //Test search by file
        HPLCAssayBeginPage beginPage = new HPLCAssayBeginPage(this);
        beginPage.setSearchBox(testFile.getName());
        DataRegionTable table = new DataRegionTable("aqwp2", this);
        Assert.assertEquals(1, table.getDataRowCount());

        //Test search by Run Identifier
        beginPage.clearSearchBox();
        beginPage.setSearchBox("TestRun001");
        table = new DataRegionTable("aqwp2", this);
        Assert.assertEquals(files.length, table.getDataRowCount());
    }

    @Test
    public void testRunViewer()
    {
        // TODO: Test the run viewer. See FormulationsTest.qualityControlHPLCData for guidance.
        navigateToAssayLandingPage();

        //Files should be loaded during setup
        File[] files = TestFileUtils.getSampleData(SAMPLE_DATA_LOC).listFiles();

        DataRegionTable runs = new DataRegionTable("aqwp2", this);
        String testFilename = files[4].getName();
        int runsIdx = runs.getIndexWhereDataAppears(testFilename, "Name");
        runs.checkCheckbox(runsIdx);

        clickButton("View Selected Runs");
        waitForElement(Locator.xpath("//*[contains(@id,'startqcbtn')]"));

        _ext4Helper.checkGridRowCheckbox(testFilename.substring(0,testFilename.length()-4)); //Trim extension
        clickButton("Overlay Selected", 0);

        waitForElementToDisappear(Locator.id("sampleinputs").notHidden());
        assertElementPresent(Locator.xpath("//*[@id='plotarea']//*[local-name() = 'path'][@class='line']"));

    }

    @Test
    public void testFileImport()
    {
        navigateToImportPage();

        File[] files = TestFileUtils.getSampleData(SAMPLE_DATA_LOC).listFiles();

        ///////////  Check run creation with single file  ///////////
        File testFile = files[3];
        HPLCUploadPage uploadPage = new HPLCUploadPage(this);
        uploadPage.uploadFile(testFile);

        //Delete file
        uploadPage.deleteFile(testFile.getName());

        //Add a file and create run
        File secondFile = files[4];
        uploadPage.uploadFile(secondFile);

        String runName = "importTest1";
        uploadPage.setRunIDField(runName);

        //Save Run
        clickButton(SAVE_BUTTON, runName);

        //Check if run results were added
        HPLCAssayBeginPage beginPage = new HPLCAssayBeginPage(this);
        beginPage.assertValuePresent(runName, 1);

        //Check if deleted file was added as result
        beginPage.setSearchBox(testFile.getName()); //Filter results to deleted filename
        assertElementNotPresent(Ext4Helper.Locators.getGridRow(runName, 0)); //Look for added run
        beginPage.clearSearchBox();

        ///////////  Check clearing run  ///////////
        //Create new run

        clickButton("Import Data");
        uploadPage.waitForPageLoad();
        runName = "importTest2";
        uploadPage.setRunIDField(runName);
        for(File dataFile : files)
            uploadPage.uploadFile(dataFile);
        assertElementPresent(Ext4Helper.Locators.getGridRow()); //Check grid has elements

        //clear run
        clickButton(CLEAR_BUTTON, 0);
        uploadPage.assertPageClear();
        goToProjectHome();  //Should not cause unload warning
    }

    private void navigateToAssayLandingPage(){
        //Navigate to Landing Page
        goToProjectHome();
        clickAndWait(Locator.linkWithText(HPLCInitializer.RAW_HPLC_ASSAY));
        HPLCAssayBeginPage page = new HPLCAssayBeginPage(this);
        page.waitForPageLoad();
    }

    private void navigateToImportPage()
    {
        navigateToAssayLandingPage();
        clickButton("Import Data");
        HPLCUploadPage page = new HPLCUploadPage(this);
        page.waitForPageLoad();
    }

    private String getUploadPageRelativeURL()
    {
        return this.getCurrentRelativeURL().replace("assayBegin","moduleAssayUpload");
    }
}