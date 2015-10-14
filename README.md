# HPLC

###Basic Setup: ###

1. Create a LabKey Assay Project/folder
2. Navigate to folder
3. Open folder management  (Admin > Folder > Management)
  1. Nav to Folder Type tab
  2. Check HPLC Module   (Leave existing checked items)
  3. click Update Folder button to save changes
4. Create Assay Design 
  1.  Select Provisional HPLC
  2.  click Next
  3.  Name is only required field (Defaults should be fine)
  4.  Save & Close
5. Add files webpart
6. Within the Files webpart create folder named **HPLCAssayData**
7. Modify ./lib/assay/provisionalHPLC/HPLCWatcher.py with your labkey server parameters
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
7. Copy modified HPLCWatcher.py to the HPLC control system local results drop folder
8. run the HPLCWatcher.py script   (Currently only Python 2 supported)
Should see:

`Configuration complete. Listening in <Your drop folder>`

You should be ready to go. Any files dropped within the watched folder should be loaded to the target LabKey instance.

To View:
1. Go to the project folder
2. Add the Experiment Runs webpart
3. select the run(s) batches you want to look at via the checkboxes
4. select `QC Selected Runs`
5. On the loaded page, select the data runs you wish to view from the left
6. Click the `Start QC` button

