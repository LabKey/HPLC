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
import org.labkey.test.util.PortalHelper;
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
        setFormElement(HPLCAssayBeginPage.Locators.searchBox, testFile.getName());
        DataRegionTable table = new DataRegionTable("aqwp2", this);
        Assert.assertEquals(1, table.getDataRowCount());


        //Test search by Run Identifier
        setFormElement(HPLCAssayBeginPage.Locators.searchBox, "");
        setFormElement(HPLCAssayBeginPage.Locators.searchBox, "TestRun001");
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
        setFormElement(HPLCUploadPage.Locators.fileInput, testFile);
        waitForElement(HPLCUploadPage.Locators.fileLogCellwithText(testFile.getName()));

        //Delete file
        click(HPLCUploadPage.Locators.fileLogDeleteCell(testFile.getName()));
        waitForElementToDisappear(HPLCUploadPage.Locators.fileLogCellwithText(testFile.getName()));
        //TODO: Check filesystem for deleted file

        //Add a file and create run
        File secondFile = files[4];
        setFormElement(HPLCUploadPage.Locators.fileInput, secondFile);
        waitForElement(HPLCUploadPage.Locators.fileLogCellwithText(secondFile.getName()));

        String runName = "importTest1";
        setFormElement(HPLCUploadPage.Locators.runIdentifier, runName);
        waitForFormElementToEqual(HPLCUploadPage.Locators.runIdentifier, runName);
        clickButton(SAVE_BUTTON, HPLCAssayBeginPage.TITLE_TEXT);

        //Check if run results were added
        assertElementPresent(HPLCAssayBeginPage.Locators.gridCell(runName), 1); //Look for run identifier in grid

        //Check if deleted file was added as result
        setFormElement(HPLCAssayBeginPage.Locators.searchBox, testFile.getName()); //Filter results to deleted filename
        assertElementNotPresent(Ext4Helper.Locators.getGridRow(runName, 0)); //Look for added run
        setFormElement(HPLCAssayBeginPage.Locators.searchBox, ""); //clear filter


        ///////////  Check clearing run  ///////////
        //Create new run
        clickButton("Import Data");
        waitForElement(HPLCUploadPage.Locators.fileInput);
        runName = "importTest2";
        setFormElement(HPLCUploadPage.Locators.runIdentifier, runName);
        for(File dataFile : files)
            setFormElement(HPLCUploadPage.Locators.fileInput, dataFile);

        //clear run
        clickButton(CLEAR_BUTTON, 0);
        assertElementNotPresent(Ext4Helper.Locators.getGridRow()); //Check grid is cleared
        waitForFormElementToEqual(HPLCUploadPage.Locators.runIdentifier, "");
        assertFormElementEquals(HPLCUploadPage.Locators.runIdentifier, ""); //check form is cleared
        goToProjectHome();  //Should not cause unload warning
        //TODO: check pipeline if uploaded files were deleted

//        for(File dataFile : files)
//            setFormElement(HPLCUploadPage.Locators.fileInput, dataFile);

    }

    private void navigateToAssayLandingPage(){
        //Navigate to Landing Page
        goToProjectHome();
        clickAndWait(Locator.linkWithText(HPLCInitializer.RAW_HPLC_ASSAY));
        waitForElement(HPLCAssayBeginPage.Locators.searchBox);
    }

    private void navigateToImportPage()
    {
        navigateToAssayLandingPage();
        clickButton("Import Data");
        waitForElement(HPLCUploadPage.Locators.fileInput);
    }
}