# HPLC

### Basic Setup: ###

1. Create a LabKey Assay Project/folder
  1. click `Create New Project`
  1. Name it and select folder type `Assay`
  1. click `Next`
  1. Set permissions and click `Next`
  1. click `Finish`
1. Navigate to folder
1. Open folder management  (Admin > Folder > Management)
  1. Nav to Folder Type tab
  1. Check `HPLC` Module   (Leave existing checked items)
  1. click `Update Folder` button to save changes
1. Create Assay Design
  1.  Select Raw HPLC as Assay definition
  1.  click `Next`
  1.  Name is only required field (Defaults should be fine)
  1.  `Save & Close`

  ### Setup Automated HPLC Result Upload  ###
The steps of this section will setup a script to automatically upload result files from a local directory to your labkey server.

1. Add `Files` webpart
1. Within the Files webpart create folder named **HPLCAssayData**
1. Modify ./lib/assay/rawHPLC/HPLCWatcher.py with your labkey server parameter
  ```
  server       = ''  # required, leave off any http(s):// and include any ports (e.g. :8000)
  target_dir   = ''  # required, Project/subfolder name
  user         = ''  # required
  password     = ''  # required
  use_ssl      = True
  context_path = ''  # optional, in development environments. Production environments tend not to use a context path.
  
  filepatterns = ["*.txt", "*.csv", "*.tsv", "*.SEQ"]
  sleep_interval = 60
  success_interval = 60
  machine_name = ''
  END_RUN_PREFIX = 'POST'
  ```
1. Copy modified HPLCWatcher.py to the HPLC control system local results drop folder
1. run the HPLCWatcher.py script   (Currently only Python 2 supported)
Should see:

`Configuration complete. Listening in <Your drop folder>`

You should be ready to go. Any files dropped within the watched folder should be loaded to the target LabKey instance.
If you do have an issue, check watch.log within the same folder for additional information.

### Import Run Results ###

1. Go to the project folder
1. Add the `HPLC Upload` webpart
1. Drag and drop any result files you want to import onto the dropzone
1. Click the `Save Run` button


## To View: ##

1. Go to the project folder
1. From the Assay List webpart click the name of the RawHPLC assay you created
1. On the loaded page, select the run(s) batches you want to look at via the checkboxes
1. select `View Selected Runs`
1. On the loaded page, select the data runs you wish to view from the left
1. Click the `Overlay Selected` button

