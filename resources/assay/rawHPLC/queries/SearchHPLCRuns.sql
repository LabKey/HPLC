SELECT Runs.RowId,
COALESCE(Runs.Name, '') || COALESCE(Runs.RunIdentifier, '') || COALESCE(Runs.Machine, '') AS Search
FROM Runs