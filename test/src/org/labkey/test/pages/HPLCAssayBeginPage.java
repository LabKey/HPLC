package org.labkey.test.pages;

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
