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
import org.labkey.test.Locators;
import org.labkey.test.TestFileUtils;
import org.labkey.test.categories.HPLC;
import org.labkey.test.pages.HPLCUploadPage;
import org.labkey.test.util.Ext4Helper;
import org.labkey.test.util.ExtHelper;
import org.labkey.test.util.HPLCInitializer;
import org.labkey.test.util.PortalHelper;

import java.io.File;
import java.util.Collections;
import java.util.List;

@Category({HPLC.class})
public class HPLCRawTest extends BaseWebDriverTest
{
    private static final String PROJECT_NAME = "HPLCRawTest";
    private static final String SAMPLE_DATA_LOC = "rawHPLC/HPLCassayData/TestRun001";
    private static final String SAVE_BUTTON = "Save Run";

    private final PortalHelper _portalHelper = new PortalHelper(this);

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
        // TODO: Test the run search feature.
    }

    @Test
    public void testRunViewer()
    {
        // TODO: Test the run viewer. See FormulationsTest.qualityControlHPLCData for guidance.
    }

    @Test
    public void testFileImport()
    {
        //Navigate to import page
        goToProjectHome();
        clickAndWait(Locator.linkWithText(HPLCInitializer.RAW_HPLC_ASSAY));
        clickButton("Import Data");

        //Check base dir created
        //Check temp dir created

        File[] files = TestFileUtils.getSampleData(SAMPLE_DATA_LOC).listFiles();
        File testFile = files[3];
        setFormElement(HPLCUploadPage.Locators.fileInput, testFile);
        waitForElement(HPLCUploadPage.Locators.fileLogCellwithText(testFile.getName()));

        //Check file uploaded

        //Delete file
        click(HPLCUploadPage.Locators.fileLogDeleteCell);
        assertElementNotPresent(HPLCUploadPage.Locators.fileLogCellwithText(testFile.getName()));

        //Check file deleted

//        for(File dataFile : files)
//            setFormElement(HPLCUploadPage.Locators.fileInput, dataFile);

        testFile = files[4];
        setFormElement(HPLCUploadPage.Locators.fileInput, testFile);
        waitForElement(HPLCUploadPage.Locators.fileLogCellwithText(testFile.getName()));

        setFormElement(HPLCUploadPage.Locators.runIdentifier, "importTest1" );
        clickButton(SAVE_BUTTON);

//        clickAndWait(Locator.linkWithText(HPLCInitializer.RAW_HPLC_ASSAY));

        //Drop file
    }
}