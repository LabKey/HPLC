#
# Copyright (c) 2013-2015 LabKey Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Author:  Nick Arnold
# Company: LabKey Software
# Date:    1.15.2013
# File:    HPLCWatch.py
# Purpose: This script is intended for use in watching and uploading HPLC files in the LabKey HPLC assay.
#          This script should be placed in the directory that is to be watched. As files are modified they
#          will be interrogated and uploaded to the server drop point.
# Built:   Python 2.7.3
# Depedendencies:
#   requests : http://docs.python-requests.org/en/latest/
#   watchdog : http://packages.python.org/watchdog/
# Depdenencies can normally be installed using the pip package manager (e.g. $> pip install requests)

import sys, time, os, threading, shutil
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.poolmanager import PoolManager
import ssl
import requests
import logging
import json

from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import PatternMatchingEventHandler

server       = '' # required, leave off any http(s):// and include any ports (e.g. :8000)
target_dir   = '' # required
user         = '' # required
password     = '' # required
use_ssl      = True
context_path = '' # optional, in development environments. Production environments tend not to use a context path.

filepatterns = ["*.txt", "*.csv", "*.tsv", "*.SEQ"]
sleep_interval = 60
success_interval = 60
machine_name = ''
END_RUN_PREFIX = 'POST'

class SafeTLSAdapter(HTTPAdapter):
	def init_poolmanager(self, connections, maxsize, block=False):
		self.poolmanager = PoolManager(num_pools=connections,
									   maxsize=maxsize,
									   block=block,
									   ssl_version=ssl.PROTOCOL_TLSv1)

# _ssl.c:504: error:14077410:SSL routines:SSL23_GET_SERVER_HELLO:sslv3 alert handshake failure
# http://lukasa.co.uk/2013/01/Choosing_SSL_Version_In_Requests/
session = requests.Session()
session.mount('https://', SafeTLSAdapter())

class HPLCHandler(PatternMatchingEventHandler):

	def __init__(self, patterns=filepatterns):
		super(HPLCHandler, self).__init__(patterns=patterns)

		try:
			self.assayId = self.requestAssay()
			self.pipelinePath = self.requestPipeline()
		except requests.exceptions.SSLError:
			logging.exception("The current SSL mode: \'" + str(use_ssl) + "\' does not match the server configuration.")
			raise Exception("Failed to configure SSL properly. See watch.log")
		except Exception, e:
			logging.exception("Failed configuration.")
			raise Exception(str(e))

		self.successTimerDelay = success_interval # time in seconds
		self.runFiles = []
		self.runFilesMap = {}
		self.folder = ""

		#
		# Initialize the run task
		#
		self.checkTask = 0

	def on_created(self, event):
		super(HPLCHandler, self).on_any_event(event)
		self.handleFileEvent(event)

	# def on_modified(self, event):
	#     super(HPLCHandler, self).on_created(event)

	def on_deleted(self, event):
		super(HPLCHandler, self).on_deleted(event)
		self.handleFileEvent(event, True)

	def handleFileEvent(self, event, is_delete=False):
		if event.is_directory == False and len(event.src_path) > 0:
			split_path = event.src_path.split("\\") # should check / or \
			if (len(split_path) > 0):
				name = str(split_path[len(split_path)-1])
				if name.find('~') == -1:
					if is_delete:
						self.removeRunFile(name)
					else:
						logging.info(" Adding file to run: " + name)
						files = {'file' : name} # (name, open(name, 'rb'))}
						self.addRunFile(name, files)

	def upload(self, fileJSON, folder):
		logging.info(" Preparing to send...")

		url = self.getScheme() + '://' + server + self.pipelinePath + '/' + folder + '/' #self.buildURL(server, context_path, target_dir)
		name = fileJSON['file']

		#
		# Attempt to open the file
		#
		_file = open(name, 'rb')
		json = {'file': (name, _file)}

		try:
			r = session.post(url, files=json, auth=(user, password))
			s = r.status_code
			if s == 207 or s == 200:
				logging.info(" " + str(s) + " Uploaded Successfully: " + name)
				print s, "Uploaded Successfully:", name
			elif s == 401:
				logging.error(" " + str(s) + " Authentication failed. Check user and password.")
				print s, "Authentication failed. Check user and password."
			elif s == 404:
				logging.error(" " + str(s) + " Location not found. URL: " + url)
				print s, "Location not found. URL:", url
			else:
				logging.error(" " + str(s) + " Failed: " + name)
				print s, "Failed:", name
		except requests.exceptions.SSLError as e:
			logging.exception("The current SSL mode: \'" + str(use_ssl) + "\' does not match the server configuration.")
			raise Exception("Failed to match server SSL configration. Upload Failed. See watch.log")
		except Exception, e:
			logging.exception("Failed upload. See watch.log")
			raise Exception(str(e))

		#
		# Ensure that the resource is closed so files can be moved/deleted
		#
		_file.close()

	def getDataFileURL(self, fileJSON, folder):
		logging.info(" Requesting file data...")

		file_name = fileJSON['file']

		#
		# Account for context path since server does recognize on webdav path
		#
		subPipelinePath = self.pipelinePath
		if len(context_path) > 0:
			subPipelinePath = self.pipelinePath.replace('/' + context_path, '')

		davPath = subPipelinePath + '/' + folder + '/' + file_name

		url = self.buildActionURL('hplc', 'getHPLCResource')
		url += '?path=' + davPath

		r = session.get(url, auth=(user, password))
		s = r.status_code
		if s == 200:
			decoded = json.JSONDecoder().decode(r.text)
			return decoded[u'DataFileUrl']

		logging.info("...done")

	def getScheme(self):
		scheme = 'http'
		if use_ssl:
			scheme += 's'
		return scheme

	def getBaseURL(self, context):
		ctx = '/' + context + '/' if len(context) > 0 else ''
		return self.getScheme() + '://' + server + '/' + ctx

	def buildURL(self, server, context, target):
		return self.getBaseURL(context) + '/' + target + '/'

	def buildActionURL(self, controller, action):
		return self.getBaseURL(context_path) + controller + '/' + target_dir + '/' + action + '.api'

	def requestAssay(self):
		assayURL = self.buildActionURL('assay', 'assayList')
		logging.info("...Requesting Assay Metadata")

		payload = {}
		payload['type'] = "Provisional HPLC"

		headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
		r = session.post(assayURL, data=json.dumps(payload), headers=headers, auth=(user, password))
		s = r.status_code
		if s == 200:
			decoded = json.JSONDecoder().decode(r.text)
			definitions = decoded[u'definitions']
			if len(definitions) != 1:
				msg = "Unable to determine target Assay. Ensure there is one and only one 'Provisional HPLC' assay present."
				logging.error(msg)
				raise Exception(msg)

			#
			# Get the definition ID
			#
			logging.info('Done. AssayID: ' + str(definitions[0][u'id']))
			return definitions[0][u'id']
		elif s == 401:
			msg = str(s) + ": Authentication failed."
			raise Exception(msg)
		else:
			msg = str(s) + ": Unable to determine target Assay."
			logging.error(msg)
			raise Exception(msg)

	def requestPipeline(self):
		actionURL = self.buildActionURL('hplc', 'getHPLCPipelineContainer')
		logging.info("...Requesting Pipeline Configuration")

		r = session.get(actionURL, auth=(user, password))
		s = r.status_code
		logging.info("...done. Status: " + str(s))

		if s == 200:
			pipe = r.json()['webDavURL']
			logging.info(" Pipeline Path: " + pipe)
			return pipe
		elif s == 401:
			msg = str(s) + ": Authentication failed."
			raise Exception(msg)
		else:
			msg = "\nUnable to process pipeline configuration.\n" + str(s) + ": " + actionURL
			msg += "\nCheck that this URL resolves and/or the HPLC module is properly installed on the server."

			logging.error(msg)
			raise Exception(msg)

	def addRunFile(self, file_name, file_json):
		if len(self.runFiles) == 0:
			print "Starting new run"

		self.runFiles.append(file_json)
		self.runFilesMap[file_name] = len(self.runFiles) - 1

		end_run = self.isEndRun(file_name)
		self.reset(end_run)
		if end_run:
			#
			# The end of the run as been established
			#
			self.runOver()

	def removeRunFile(self, file_name):
		index = self.runFilesMap.get(file_name)
		if index:
			if len(self.runFiles) > index:
				#
				# The file was found, remove it
				#
				logging.info(" Remove file from run: " + file_name)
				del self.runFiles[index]
			else:
				logging.info(" Index out of sync for: " + file_name)
			self.runFilesMap.pop(file_name)
			# else:
			#     logging.info(" File not tracked at time of remove request: " + file_name)


	def isEndRun(self, file_name):
		return file_name.find(END_RUN_PREFIX) == 0

	def reset(self, end_run):
		if self.checkTask != 0:
			self.checkTask.cancel()
		if end_run == False:
			self.checkTask = self.getCheckTask()
			self.checkTask.start()

	def getCheckTask(self):
		return threading.Timer(self.successTimerDelay, self.runOver)

	def runOver(self):
		logging.info("...Current run is over, no other files were uploaded. Attempting to push run to server...")

		#
		# Create a unique folder in the pipeline for upload
		#
		self.folder = self.generateFolderName()
		folderURL = self.getScheme() + '://' + server + self.pipelinePath + '/' + self.folder
		r = session.request('MKCOL', folderURL, auth=(user, password))
		s = r.status_code

		if s == 201:
			logging.info(" Created folder (" + self.folder + ")")
			print "Folder Created:", self.folder

			#
			# Iterate over each file in the current run and upload to server
			#
			for f in self.runFiles:
				self.upload(f, self.folder)

			#
			# Move all files into a run folder
			#
			os.mkdir(self.folder)
			cwd = os.getcwd()

			#
			# OS delimiter
			#
			delimiter = '/'
			if sys.platform == "win32":
				delimiter = "\\"

			destPath = cwd + delimiter + self.folder + delimiter
			print "Destination:", destPath

			for f in self.runFiles:
				fileName = f['file']
				dest = destPath + fileName
				source = cwd + delimiter + fileName
				print "Source:", source
				shutil.move(source, dest)

			#
			# Now iterate over each file and determine the dataFileURL
			#
			runFiles = [] # deep copy
			for i in range(len(self.runFiles)):
				runFiles.append(self.runFiles[i])

			for rf in runFiles:
				rf['DataFileUrl'] = self.getDataFileURL(rf, self.folder)

			self.runFiles = runFiles
			print "Found Data File URLs..."

			#
			# Files are fully processed, now update run information in Assay
			#
			hplcRun = self.createHPLCRun()

			saveURL = self.buildActionURL('assay', 'saveAssayBatch')

			hplcRun.save(saveURL)

			logging.info("...done")
		else:
			logging.error(" Failed to created folder (" + self.folder + ") in " + folderURL)
			print "Failed to create folder:", self.folder

		self.runFiles = []
		self.runFilesMap = {}
		self.checkTask = 0
		self.folder = ""

		print "Preparation for next run complete."

	def generateFolderName(self):
		lt = time.localtime()
		name = ""
		sep = ""
		for tm in lt[0:6]: # from year to second
			name += sep + str(tm)
			sep = "_"

		print name
		return name

	def createHPLCRun(self):
		hplcRun = HPLCRun(self.assayId)

		#
		# Prepare run level information
		#
		hplcRun.setRunIdentifier(self.folder)
		hplcRun.setMachineName(machine_name)

		#
		# Prepare result level information
		#
		dataRows = []
		dataInputs = []
		for runFile in self.runFiles:
			fName = runFile['file']
			data = {"Name": fName, "DataFile": fName, "TestType": "SMP"}
			dataRows.append(data)

			f = runFile['DataFileUrl']
			data = {"dataFileURL": f, "name": fName}
			dataInputs.append(data)

		hplcRun.setResult(dataRows)
		hplcRun.setDataInputs(dataInputs)

		return hplcRun

# TODO: Information to pull from file:
#   - Result name
#   - Result type (SMP or STD)
#
#
class HPLCRun():

	def __init__(self, assayId):
		self.assayId = assayId
		self.comment = None
		self.created = None
		self.createdBy = None
		self.dataInputs = []
		self.dataOutputs = []
		self.dataRows = []
		self.experiments = []
		self.filePathRoot = None
		self.id = None
		self.lsid = None
		self.materialInputs = []
		self.materialOutputs = []
		self.modified = None
		self.modifiedBy = None
		self.name = None
		self.objectProperties = {}
		self.properties = {"Published": False}
		self.protocol = None
		self.rowId = None

	def save(self, saveURL):
		print "Saving HPLC Run...", saveURL

		#
		# This is the only run in this batch
		#
		me = {
			'name': self.name,
			'properties': self.properties,
			'dataRows': self.dataRows,
			'dataInputs': self.dataInputs
		}

		batch = {'batchProtocolId': self.assayId, 'runs': [me]}
		payload = {'assayId': self.assayId, 'batch': batch}
		headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}

		# print "****** PAYLOAD ********"
		# print json.dumps(payload)

		r = session.post(saveURL, data=json.dumps(payload), headers=headers, auth=(user, password))
		s = r.status_code

		if s == 400:
			print r.status_code, "Bad Request"
			print r.text
			print r.json
		elif s == 500:
			print r.status_code, "Server Error"
			print r.text
			print r.json
			logging.error(r.status_code)
			logging.error(r.text)
			logging.error(r.json)
			logging.error("Failed to create Assay Run due to server error")
		else:
			logging.info("Run saved successfully.")
			print "Run saved Successfully."



	def addResult(self, resultRow):
		self.dataRows.append(resultRow)

	def setResult(self, resultRows):
		self.dataRows = resultRows

	def setMachineName(self, machineName):
		self.properties["Machine"] = machineName

	def setRunIdentifier(self, identifier):
		self.name = identifier
		self.properties["RunIdentifier"] = identifier

	def setDataInputs(self, dataInputs):
		self.dataInputs = dataInputs

class HPLCAssay():

	def __init__(self):
		self.containerPath = None
		self.description = None
		self.domains = {}
		self.id = None
		self.importAction = None
		self.importController = None
		self.name = None
		self.projectLevel = True
		self.protocolSchemaName = None
		self.type = None

if __name__ == "__main__":

	#
	# Configure Logging
	#
	logging.basicConfig(level=logging.DEBUG,
						filename='watch.log',
						format='%(asctime)s %(levelname)s: %(message)s',
						datefmt='%Y-%m-%d %H:%M:%S')
	logging.info('\n\n\nStarting HPLCWatch: ' + str(datetime.now()))

	#
	# Configure path being watched
	#
	path = "."
	if len(sys.argv) > 1:
		path = sys.argv[1]
	else:
		path = os.path.abspath(path)

	os.chdir(path)

	logging.info(" Watching: " + path)
	logging.info(" File Matchers: " + str(filepatterns))
	logging.info(" sleep_interval: " + str(sleep_interval))

	#
	# Start observing the configured path
	#
	obs = Observer()
	obs.schedule(HPLCHandler(), path=path, recursive=False)
	obs.start()

	#
	# Let the command line user know it is responding
	#
	print "Configuration complete. Listening in", path

	try:
		while True:
			time.sleep(sleep_interval)
	except KeyboardInterrupt:
		logging.info(" Keyboard Interrupt: Expected from User.")
		obs.stop()
	obs.join()
