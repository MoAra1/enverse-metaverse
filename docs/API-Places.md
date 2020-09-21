# MetaverseAPI - Place Management

Requests that create and manage Place entries

## GET /api/v1/user/places

Get the list of places.

```
    {
        "status": "success",
        "data": {
            "places": [
                {
                    "placeId": string,
                    "name": string,
                    "address": string,
                    "description": string,
                    "domain": {
                        "id": domainId,
                        "name": domainName,
                        "network_address": string,
                        "ice_server_address": string
                    },
                    "accountId": string
                },
                ...
            ]
        }
    }
```

## GET /api/v1/user/places/{placeId}

Get the place information for one place.

```
    {
        "status": "success",
        "data": {
            "place": {
                "placeId": string,
                "name": string,
                "address": string,
                "description": string,
                "domain": {
                    "id": domainId,
                    "name": domainName,
                    "network_address": string,
                    "ice_server_address": string
                },
                "accountId": string
            }
        }
    }
```

## POST /api/v1/user/places

Create a place entry. A place points to a domain so creation information
contains a domainId of the domain the place points to.

To create a place, one must either be an admin account or
the account that is associated with  the domain.

The address is formatted as "//x,y,z/x,y,z,w/".

```
    {
        "place": {
            "name": placeName,
            "description": descriptionText,
            "address": addressString,
            "domainId": domainId
        }
    }
```

The response for a successful creation looks like the
response for the one place entry GET operation.

## DELETE /api/v1/user/places/{placeId}

Delete the place entry.

The requestor must be either an admin account or the
account associated with the domain.