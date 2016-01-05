SELECT
Data.RowId,
COALESCE(Data.Name, '') || COALESCE(Data.Run.RunIdentifier, '') || COALESCE(Data.Run.Machine, '') AS Search
FROM Data