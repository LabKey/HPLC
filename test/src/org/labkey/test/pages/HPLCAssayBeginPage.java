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


    public static class Locators
    {
        public static final Locator.XPathLocator searchBox = Locator.xpath("//input[contains(@name,'runs-search')]");
        public static Locator.XPathLocator gridCell (String contents)
        {
            return Locator.xpath("//tr[contains(@class,'labkey-row')]//td[text()='" + contents + "']");
        }
    }
}
