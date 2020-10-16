//   Copyright 2020 Vircadia Contributors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

'use strict';

import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { setupMetaverseAPI, finishMetaverseAPI, param1FromParams } from '@Route-Tools/middleware';
import { accountFromAuthToken } from '@Route-Tools/middleware';

import { checkAccessToEntity, Perm } from '@Route-Tools/Permissions';

import { buildPlaceInfo } from '@Route-Tools/Util';

import { Accounts } from '@Entities/Accounts';
import { Places } from '@Entities/Places';
import { setPlaceField } from '@Entities/PlaceEntity';

import { PaginationInfo } from '@Entities/EntityFilters/PaginationInfo';
import { AccountScopeFilter } from '@Entities/EntityFilters/AccountScopeFilter';
import { IsNullOrEmpty } from '@Tools/Misc';
import { VKeyedCollection } from '@Tools/vTypes';
import { Logger } from '@Tools/Logging';

const procGetPlaces: RequestHandler = async (req: Request, resp: Response, next: NextFunction) => {
  if (req.vAuthAccount) {
    const scoper = new AccountScopeFilter(req.vAuthAccount);
    const pager = new PaginationInfo();

    scoper.parametersFromRequest(req);
    pager.parametersFromRequest(req);

    const allPlaces: any[] = [];
    for await (const place of Places.enumerateAsync(scoper, pager)) {
      allPlaces.push(await buildPlaceInfo(place));
    };

    req.vRestResp.Data = {
      'places': allPlaces
    };
  }
  else {
    req.vRestResp.respondFailure('unauthorized');
  };
  next();
};

export const procGetPlacesPlaceId: RequestHandler = async (req: Request, resp: Response, next: NextFunction) => {
  let aPlace = await Places.getPlaceWithId(req.vParam1);
  if (IsNullOrEmpty(aPlace)) {
    // the request can be made for the ID or the placename
    aPlace = await Places.getPlaceWithName(req.vParam1);
  }
  if (aPlace) {
    if (checkAccessToEntity(req.vAuthToken, aPlace, [ Perm.OWNER, Perm.ADMIN ], req.vAuthAccount)) {
      req.vRestResp.Data = {
        'place': await buildPlaceInfo(aPlace)
      };
    }
    else {
      req.vRestResp.respondFailure('unauthorized');
    };
  }
  else {
    req.vRestResp.respondFailure('No such place');
  };
  next();
};

// Update place information
// This request happens when a domain is being assigned to another domain
export const procPutPlacesPlaceId: RequestHandler = async (req: Request, resp: Response, next: NextFunction) => {
  if (req.vAuthAccount && req.vParam1) {
    const aPlace = await Places.getPlaceWithId(req.vParam1);
    if (aPlace) {
      if (req.vAuthAccount.id === aPlace.accountId || Accounts.isAdmin(req.vAuthAccount)) {
        if (req.body.place) {
          const updates: VKeyedCollection = {};
          if (req.body.place.pointee_query) {
            // The caller specified a domain. Either the same domain or changing
            if (req.body.place.pointee_query !== aPlace.domainId) {
              Logger.info(`procPutPlacesPlaceId: domain changing from ${aPlace.domainId} to ${req.body.place.pointee_query}`)
              aPlace.domainId = req.body.place.pointee_query;
              updates.domainId = aPlace.domainId;
            };
          };
          for (const field of [ 'path', 'address', 'description', 'thumbnail' ]) {
            if (req.body.place.hasOwnProperty(field)) {
              await setPlaceField(req.vAuthToken, aPlace, field, req.body.place[field], req.vAuthAccount, updates);
            };
          };
          Places.updateEntityFields(aPlace, updates);
        }
        else {
          req.vRestResp.respondFailure('badly formed data');
        };
      }
      else {
        req.vRestResp.respondFailure('unauthorized');
      };
    }
    else {
      req.vRestResp.respondFailure('no such place');
    };
  }
  else {
    req.vRestResp.respondFailure('no account');
  };
  next();
};
// Delete a Place
export const procDeletePlacesPlaceId: RequestHandler = async (req: Request, resp: Response, next: NextFunction) => {
  if (req.vAuthAccount && req.vParam1) {
    const aPlace = await Places.getPlaceWithId(req.vParam1);
    if (aPlace) {
      if (req.vAuthAccount.id === aPlace.accountId || Accounts.isAdmin(req.vAuthAccount)) {
          await Places.removePlace(aPlace);
      }
      else {
        req.vRestResp.respondFailure('unauthorized');
      };
    }
    else {
      req.vRestResp.respondFailure('no such place');
    };
  }
  else {
    req.vRestResp.respondFailure('no authorization or parameter');
  };
  next();
};

export const name = '/api/v1/places/:placeId';

export const router = Router();

router.get(   '/api/v1/places/:param1',
                                     [ setupMetaverseAPI,   // req.vRESTResp
                                      param1FromParams,     // req.vParam1
                                      procGetPlacesPlaceId,
                                      finishMetaverseAPI ] );
router.put( '/api/v1/places/:param1',
                                     [ setupMetaverseAPI,   // req.vRESTResp
                                      accountFromAuthToken, // req.vAuthAccount
                                      param1FromParams,     // req.vParam1
                                      procPutPlacesPlaceId,
                                      finishMetaverseAPI ] );
router.delete( '/api/v1/places/:param1',
                                     [ setupMetaverseAPI,   // req.vRESTResp
                                      accountFromAuthToken, // req.vAuthAccount
                                      param1FromParams,     // req.vParam1
                                      procDeletePlacesPlaceId,
                                      finishMetaverseAPI ] );

