import React from 'react';
import { categories } from '../data/products';

export default function Categories({ activeCategory, onSelectCategory }) {
  return (
    <div className="col-md-12 col-12 sticky-header sticky">
      <div className="container-button d-flex p-2 bd-highlight mb-2 box-menu1">
        <div className="cont-category bd-highlight p-2" id="cont-category">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button 
                key={cat.id}
                id={cat.id === 'popular' ? 'popularButton' : `catButton_${cat.id}`}
                className={`text-uppercase btn button-size font-weight-bolder ${
                  isActive 
                    ? 'btn-warning text-dark' 
                    : 'btn-outline-warning text-white'
                }`}
                style={{ 
                  backgroundColor: isActive ? '#ffc008' : 'transparent',
                  color: isActive ? '#000' : '#ffc107',
                  border: '1px solid #ffc107',
                  marginRight: '6px'
                }}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
              >
                <b className="box-menu2">{cat.name}</b>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
