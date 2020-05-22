import { takeLatest, call, put, all } from 'redux-saga/effects';

import {
    fetchCollectionsSuccess,
    fetchCollectionsFailure,
    fetchCategoriesSuccess,
    fetchCategoriesFailure,
    fetchProductDetailsSuccess,
    fetchProductDetailsFailure
} from './shop.actions';

import { SEARCH_ALL, CATEGORY_DESCRIPTIONS } from './shop.data.js';
import ShopActionTypes from './shop.types';
import { generateQueryString } from './shop.utils';

export function* fetchCollectionsAsync({ payload: { tagCode, collectionName, categoryId, filters }}) {
    try {
        const queryString = generateQueryString(filters);
        const response = yield fetch(`https://apidojo-hm-hennes-mauritz-v1.p.rapidapi.com/products/list?categories=${tagCode}&${queryString}&concepts=DIVIDED&country=us&lang=en&currentpage=0&pagesize=30`, {
            "method": "GET",
            "headers": {
                "x-rapidapi-host": "apidojo-hm-hennes-mauritz-v1.p.rapidapi.com",
                "x-rapidapi-key": "0e3e663af0msh5a39e9c2bfe5aecp190e1ajsn157832385380"
            }
        });
        const responseJson = yield response.json();
        const mapJsonToState = {
            collectionName,
            categoryId,
            collection: {
                results: responseJson.results,
                pagination: responseJson.pagination,
                facets: responseJson.facets
            }
        };

        yield put(fetchCollectionsSuccess(mapJsonToState));
    } catch (error) {
        yield put(fetchCollectionsFailure(error.message))
    }
}

function* fetchCategoriesAsync() {
    try {
        const response = yield fetch("https://apidojo-hm-hennes-mauritz-v1.p.rapidapi.com/categories/list?country=us&lang=en", {
            "method": "GET",
            "headers": {
                "x-rapidapi-host": "apidojo-hm-hennes-mauritz-v1.p.rapidapi.com",
                "x-rapidapi-key": "0e3e663af0msh5a39e9c2bfe5aecp190e1ajsn157832385380"
            }
        });
        const responseJson = yield response.json();

        const reduceJson = (json, categoryType) => {
            const filteredResponse  = json
                    .filter(category => category.CatName === categoryType)
                    .map(category => {
                        return category.CategoriesArray
                                .filter(subcategory => subcategory.CatName === 'Shop by Concept')[0]
                                .CategoriesArray
                                .filter(concept => concept.CatName === 'Divided')[0]
                                .CategoriesArray      
                    })[0];

            const categoriesWithDescriptions = filteredResponse.map(item => {
                if (item.tagCodes[0] in CATEGORY_DESCRIPTIONS) {
                    return { ...item, description: CATEGORY_DESCRIPTIONS[item.tagCodes[0]]}
                }
                
                return { ...item };
            });
            
            return categoriesWithDescriptions;
        };

        const mapJsonToState = {
            guys: SEARCH_ALL.guys.concat(reduceJson(responseJson, 'Men')),
            girls: SEARCH_ALL.girls.concat(reduceJson(responseJson, 'Women'))
        };

        yield put(fetchCategoriesSuccess(mapJsonToState));
    } catch (error) {
        yield put(fetchCategoriesFailure(error.message));
    }
}

export function* onFetchCollectionsStart() {
    yield takeLatest(
        ShopActionTypes.FETCH_COLLECTIONS_START, 
        fetchCollectionsAsync
    );
}

function* onFetchCategoriesStart() {
    yield takeLatest(
        ShopActionTypes.FETCH_CATEGORIES_START,
        fetchCategoriesAsync
    );
}

function* onFetchProductDetailsStart() {
    yield takeLatest(
        ShopActionTypes.FETCH_PRODUCT_DETAILS_START,
        fetchProductDetailsAsync
    );
}

export function* shopSagas() {
    yield all([
        call(onFetchCollectionsStart),
        call(onFetchCategoriesStart)
    ]);
}