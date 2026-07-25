import React from 'react';

const Categories = () => {
  return (
    <div className="container col-md-8 col-12 mt-3">
      <div className="list-product">
        <div className="col-md-12 col-12 sticky-header" style={{ borderRadius: '10px' }}>
          <div className="container-button d-flex p-2 bd-highlight mb-2 box-menu1" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <div className="cont-category bd-highlight p-2 d-flex gap-2" id="cont-category">
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Populer</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-warning text-dark button-size font-weight-bolder" type="button">
                <b className="box-menu2">Top up Game</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Voucher Game</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Hiburan</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Pulsa & Paket Data</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">E-Wallet</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Tagihan</b>
              </button>
              <button style={{ backgroundColor: '#ffc008', color: 'black' }} className="btn-allprd text-uppercase btn btn-outline-warning button-size font-weight-bolder" type="button">
                <b className="box-menu2">Gift Card</b>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
