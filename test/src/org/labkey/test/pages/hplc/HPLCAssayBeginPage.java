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
package org.labkey.test.pages.hplc;

import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;

/**
 * Created by iansigmon on 2/5/16.
 */
public class HPLCAssayBeginPage
{
    public static final String TITLE_TEXT = "RawHPLC Overview";

    protected BaseWebDriverTest _test;

    public HPLCAssayBeginPage(BaseWebDriverTest test)
    {
        _test = test;
    }

    public void setSearchBox(String value)
    {
        _test.setFormElement(Locators.searchBox, value);
        _test.waitForText("Search CONTAINS " + value);
        _test.waitForFormElementToEqual(Locators.searchBox, value);
    }

    public void clearSearchBox()
    {
        setSearchBox("");
    }

    public void waitForPageLoad()
    {
        _test.waitForElement(Locators.searchBox, 1000);
    }

    public void assertValuePresent(String value, int qty)
    {
        _test.assertElementPresent(Locators.gridCell(value), qty); //Look for run identifier in grid
    }


    private static class Locators
    {
        private static final Locator.XPathLocator searchBox = Locator.xpath("//input[contains(@name,'runs-search')]");
        public static Locator.XPathLocator gridCell (String contents)
        {
            return Locator.xpath("//tr[contains(@class,'labkey-row')]//td[text()='" + contents + "']");
        }
    }
}
