-- Remove "principal" bad tag from all problems (data entry error, not a valid CP tag)
update problems
set tags = array_remove(tags, 'principal')
where 'principal' = any(tags);
