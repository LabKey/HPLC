package org.labkey.test.pages;

import org.labkey.test.BaseWebDriverTest;
import org.labkey.test.Locator;

/**
 * Created by iansigmon on 2/4/16.
 */
public class HPLCUploadPage
{
    protected BaseWebDriverTest _test;

    public HPLCUploadPage(BaseWebDriverTest test)
    {
        _test = test;
    }


    public static class Locators
    {
        public static final Locator.XPathLocator runIdentifier = Locator.xpath("//input[contains(@id,'RunIdentifier']");
        public static final Locator.XPathLocator fileInput = Locator.xpath("//input[@type='file']");
        public static Locator.XPathLocator fileLogCellwithText(String text)
        {
            return Locator.xpath("//td[@role='gridcell']//*[text()=" + text + "]");
        }

        public static final Locator.XPathLocator fileLogDeleteCell = Locator.xpath("//td[@role='gridcell']//img[contains(@class, 'iconDelete']]");




    }



}
