# HPLC

####This module is deprecated and is not under active development. Active development has been migrated to the [Signal Data module](https://github.com/LabKey/signalData/blob/develop/README.md).####

### Basic Setup: ###

1. Create a LabKey Assay Project/Folder
  1. Hover over the Project or Folder menu, and click **Create Project** or **Create Subfolder**.
  1. Provide a Name and select type **Assay**.
  1. Click **Next**.
  1. Set permissions (optional) and click **Next**.
  1. Click **Finish**.
1. Enable the HPLC module 
  1. Navigate to the new folder.
  1. Open folder management (Go to **Admin > Folder > Management**).
  1. Click the **Folder Type** tab.
  1. Under **Modules**, check the **HPLC** module. (Leave existing checked items.)
  1. Click the **Update Folder** button to save changes.
1. Create an Assay Design
  1.  In the **Assay List** web part, click **New Assay Design**.
  1.  On the New Assay Design page, select **Raw HPLC** as the assay type.
  1.  Click **Next**.
  1.  Name is the only required field. (Design default values should work fine.)
  1.  Click the **Save & Close** button.

### Setup Automated HPLC Result Upload  ###

The steps of this section will setup a script to automatically upload result files from a local directory to your labkey server.

1. Add the **Files** webpart.
1. Within the Files webpart create a folder named **HPLCAssayData**.
1. Modify ./lib/assay/rawHPLC/HPLCWatcher.py with your labkey server parameter.
  ```
  server       = ''  # required, leave off any http(s):// and include any ports (e.g. :8000)
  target_dir   = ''  # required, Project/subfolder name
  user         = ''  # required
  password     = ''  # required
  use_ssl      = True
  context_path = ''  # Optional, used in development environments. Production environments tend not to use a context path.
  
  filepatterns = ["*.txt", "*.csv", "*.tsv", "*.SEQ"]
  sleep_interval = 60
  success_interval = 60
  machine_name = ''
  END_RUN_PREFIX = 'POST'
  ```
1. Copy modified HPLCWatcher.py to the HPLC control system local results drop folder.
1. run the HPLCWatcher.py script   (Currently only Python 2 supported).
You should see:

**Configuration complete. Listening in <Your drop folder>**

You should be ready to go. Any files dropped within the watched folder should be loaded to the target LabKey instance.
If you do have an issue, check watch.log within the same folder for additional information.

### Manually Import HPLC Results ###

To manually upload result files, follow these instructions: 

1. Go to the folder where you wish to upload results.
1. Add the **HPLC Upload** webpart.
1. Drag-and-drop any result files you want to import onto the dropzone.

![Drag-and-drop to upload a run](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc0.png)

1. Specify a Run Identifier (required).
1. Click the **Save Run** button.

![Name and save a run](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc2.png)

## View Results ##

To view chromatograms for HPLC results, follow these instructions:

1. Go to the folder where your HPLC results reside.
1. On the **Assay List** webpart, click the name of the RawHPLC assay you created.
1. Select the run(s) you want to look at, using the checkboxes.
1. Click **View Selected Runs**.

![View runs](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc3.png) 

1. Select the data run(s) you wish to view from the left.
1. Click the `Overlay Selected` button.

![View runs](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc4.png) 

1. The left selection pane will close, and the overlayed results will be displayed in the center pane.

![View runs](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc5.png) 

1. You can zoom into the graph by entering values in the **Time** and **mV Range** text boxes, or by drawing a new area inside the graph using the mouse.

![View runs](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc6.png) 

Enter values in the right pane to calucluate areas under the curves. Select in the name column to highlight different graph lines.

![View runs](https://www.labkey.org/wiki/home/Documentation/download.view?entityId=303de39a-f9df-1033-93d6-a3afb15978a8&name=hplc7.png) 

## Installing the HPLC Module ##

[Contact us](https://www.labkey.com/company/contact-us) for details on installing the HPLC module.
