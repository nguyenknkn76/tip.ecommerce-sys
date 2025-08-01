# Model Design

### Discount 

| no  | attributes                   | meaning                                                                                            | description |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `discount_name`              |                                                                                                    |             |
| 2   | `discount_description`       |                                                                                                    |             |
| 3   | `discount_type`              | fixed amount or percentage                                                                         |             |
| 4   | `discount_value`             |                                                                                                    |             |
| 5   | `discount_code`              |                                                                                                    |             |
| 6   | `discount_start_date`        |                                                                                                    |             |
| 7   | `discount_end_date`          |                                                                                                    |             |
| 8   | `discount_max_uses`          | number of discount that be applied                                                                 |             |
| 9   | `discount_uses_count`        | number of discount that be used                                                                    |             |
| 10  | `discount_users_used`        | list of people who use discount                                                                    |             |
| 11  | `discount_max_uses_per_user` | max number of discount per can be used per clients                                                 |             |
| 12  | `discount_min_order_value`   |                                                                                                    |             |
| 13  | `discount_shopId`            |                                                                                                    |             |
| 14  | `discount_is_active`         |                                                                                                    |             |
| 15  | `discount_applied_to`        |                                                                                                    |             |
| 16  | `discount_product_ids`       | products that can be applied this discount                                                         |             |
| 17  | enhance attributes           | discount for categories, location, mix discount, discount level, notify via mail, discount history |             |
