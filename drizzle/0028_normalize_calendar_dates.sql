UPDATE `books`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `movies`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `games`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `manga`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `manga`
SET `end_date` = substr(`end_date`, 1, 10)
WHERE `end_date` IS NOT NULL
  AND length(`end_date`) >= 10
  AND `end_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `series`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `series`
SET `last_air_date` = substr(`last_air_date`, 1, 10)
WHERE `last_air_date` IS NOT NULL
  AND length(`last_air_date`) >= 10
  AND `last_air_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `series`
SET `next_episode_to_air` = substr(`next_episode_to_air`, 1, 10)
WHERE `next_episode_to_air` IS NOT NULL
  AND length(`next_episode_to_air`) >= 10
  AND `next_episode_to_air` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `anime`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `anime`
SET `last_air_date` = substr(`last_air_date`, 1, 10)
WHERE `last_air_date` IS NOT NULL
  AND length(`last_air_date`) >= 10
  AND `last_air_date` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `anime`
SET `next_episode_to_air` = substr(`next_episode_to_air`, 1, 10)
WHERE `next_episode_to_air` IS NOT NULL
  AND length(`next_episode_to_air`) >= 10
  AND `next_episode_to_air` LIKE '____-__-__%';--> statement-breakpoint

UPDATE `media_notifications`
SET `release_date` = substr(`release_date`, 1, 10)
WHERE `release_date` IS NOT NULL
  AND length(`release_date`) >= 10
  AND `release_date` LIKE '____-__-__%';
