UPDATE `account`
SET `password` = CAST(`password` AS text)
WHERE `password` IS NOT NULL AND typeof(`password`) = 'blob';
