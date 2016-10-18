Feature: Authentication using HTTP-Auth

  Scenario: Request with basic authentication using static username/password
    When I send a request to '/tokenify/httpauth/authorized' with username 'invaliduser' and password 'secretpassword' in 'basic' mode
    Then the response has statusCode '401' and contains the object '{ }'
    When I send a request to '/tokenify/httpauth/authorized' with username 'static1' and password 'dobietday' in 'basic' mode
    Then the response has statusCode '200' and contains the object '{ "status": 200, "message": "authorized" }'

  Scenario: Request with basic authentication using invalid username/password from REST API
    Given a mock rest server provides method '["POST"]' on path '/auth' with the mapping
      | requestBody | responseCode | responseBody |
      | { "username": "invaliduser", "password": "secretpassword" } | 401 | {"status": 1} |
    When I send a request to '/tokenify/httpauth/authorized' with username 'invaliduser' and password 'secretpassword' in 'basic' mode
    Then the response has statusCode '401' and contains the object '{ }'

  Scenario: Request with basic authentication using valid username/password from REST API
    Given a mock rest server provides method '["POST"]' on path '/auth' with the mapping
      | requestBody | responseCode | responseBody |
      | { "realm": "mycompany", "username": "apiuser", "password": "dobietday" } | 200 | {"status": 0, "permissions": ["perm1", "perm2"]} |
    When I send a request to '/tokenify/httpauth/authorized' with username 'mycompany/apiuser' and password 'dobietday' in 'basic' mode
    Then the response has statusCode '200' and contains the object '{ "status": 200, "message": "authorized" }'