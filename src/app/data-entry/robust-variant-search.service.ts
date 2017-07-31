/**
 * Used to query for variants.
 */

import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { FilterableSearchService } from './filterable-search/filterable-search.component';
import { Gene, Variant } from '../global/genomic-data';
import { VariantDataProvider } from './providers/database-services.interface';
import { MyVariantInfoSearchService } from './providers/myvariantinfo-search.service';

@Injectable()
export class RobustVariantSearchService implements FilterableSearchService {

  constructor(private myvariantinfoSearchService: MyVariantInfoSearchService) {}

  variantDataProviders: VariantDataProvider[] = [this.myvariantinfoSearchService];

  // Provided by the gene search filterable dropdown on selection.
  geneContext: Gene;
  onGeneChosen(gene: Gene) {
    console.log('Got gene chosen', gene);
    this.geneContext = gene;
  }

  public search = (term: string): Observable<Variant[]> => {
    if (!this.geneContext) {
      console.log('Searching with no gene chosen!');
      return Observable.of <Variant[]> ([]);
    }

    // map them into a array of observables and forkJoin
    return Observable.forkJoin(this.variantDataProviders
      .map(searchService => searchService.provideVariants(term, this.geneContext))
    ).map((variantArrays: Variant[][]) => {
        const massiveVariantArray: Variant[] = [];

        const addVariant = (variant: Variant) => {
          for (let arrayIndex = 0; arrayIndex < massiveVariantArray.length; arrayIndex++) {
            // Make sure that we are sorting alphabetically.
            if (massiveVariantArray[arrayIndex].optionName() === variant.optionName()) {
              massiveVariantArray[arrayIndex].mergeWith(variant);
              console.log('Merged ' + variant.optionName());
              return;
            } else if (massiveVariantArray[arrayIndex].optionName() > variant.optionName()) {
              massiveVariantArray.splice(arrayIndex, 0, variant);
              return;
            }
          }

          // It must've not been pushed if we reach here.
          massiveVariantArray.push(variant);
        }

        // Variant merging/placing loop.
        for (const variantArray of variantArrays) {
          for (const variant of variantArray) {
            addVariant(variant);
          }
        }
        return massiveVariantArray;
      }
    );
  }

  // Used to check the validity of a given HGVS ID.
  public validateHGVSID = (hgvsID: string): Observable<boolean> => {
    // If any of them validate it successfully, it's a valid ID.
    return Observable.forkJoin(this.variantDataProviders
      .map(searchService => searchService.validateHGVSID(hgvsID))
    ).map((resultArray: boolean[]) => {
      console.log('Got result array');
      for (const result of resultArray) {
        if (result) {
          console.log('Valid');
          return true;
        }
      }
      console.log('Invalid');
      return false;
    });
  }
}