UPDATE `account`
SET
    `access_token_expires_at` = CASE WHEN `access_token` LIKE '$ba$%' THEN `access_token_expires_at` ELSE NULL END,
    `refresh_token_expires_at` = CASE WHEN `refresh_token` LIKE '$ba$%' THEN `refresh_token_expires_at` ELSE NULL END,
    `access_token` = CASE WHEN `access_token` LIKE '$ba$%' THEN `access_token` ELSE NULL END,
    `refresh_token` = CASE WHEN `refresh_token` LIKE '$ba$%' THEN `refresh_token` ELSE NULL END,
    `id_token` = NULL
WHERE `provider_id` != 'credential'
  AND (
      (`access_token` IS NOT NULL AND `access_token` NOT LIKE '$ba$%') OR
      (`refresh_token` IS NOT NULL AND `refresh_token` NOT LIKE '$ba$%') OR
      `id_token` IS NOT NULL
  );
