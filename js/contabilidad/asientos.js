/* ============================================
   CONTABILIDAD.CSS - Modas La 34
   ============================================ */
:root{--bg:#14142a;--bg2:#1a1a2e;--panel:#20203a;--panel2:#272745;--line:rgba(255,255,255,.08);
--acc:#d4a5a9;--acc2:#e8c4c8;--txt:#e8e8f0;--mut:#a0a0b0;--ok:#4ade80;--bad:#f87171;--warn:#fbbf24;--info:#38bdf8;--r:12px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--txt);font-size:14px;line-height:1.45;min-height:100vh}
button,input,select,textarea{font-family:inherit;font-size:inherit;color:inherit}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}

/* Header */
.header{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;
padding:.9rem 1.5rem;background:var(--bg2);border-bottom:1px solid var(--line)}
.header h1{font-size:1.2rem;font-weight:700;letter-spacing:.5px;display:flex;align-items:center;gap:.6rem}
.header h1 span{color:var(--acc);font-weight:400}
.header-buttons{display:flex;gap:.6rem;flex-wrap:wrap}
.btn-outline,.btn-export,.btn-aplicar,.btn-crear,.btn-cancelar,.btn-guardar,.btn-borrador,.btn-eliminar-asiento,.btn-agregar-linea,.btn-mas{
display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .95rem;border-radius:8px;border:1px solid var(--acc);background:transparent;
color:var(--acc);cursor:pointer;text-decoration:none;font-weight:500;transition:.15s}
.btn-outline:hover,.btn-export:hover,.btn-aplicar:hover,.btn-agregar-linea:hover,.btn-mas:hover{background:var(--acc);color:var(--bg2)}
.btn-guardar,.btn-crear{background:var(--acc);color:var(--bg2);font-weight:600}
.btn-guardar:hover,.btn-crear:hover{background:var(--acc2)}
.btn-cancelar{border-color:var(--line);color:var(--mut)}.btn-cancelar:hover{color:var(--txt)}
.btn-borrador{border-color:var(--warn);color:var(--warn)}.btn-borrador:hover{background:var(--warn);color:var(--bg2)}
.btn-eliminar-asiento{border-color:var(--bad);color:var(--bad);margin-right:auto}.btn-eliminar-asiento:hover{background:var(--bad);color:#fff}
.btn-mas{margin:1rem auto;display:flex}

.container{max-width:1400px;margin:0 auto;padding:1.5rem}

/* Periodo */
.periodo-card{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;background:var(--panel);
border:1px solid var(--line);border-radius:var(--r);padding:.9rem 1.1rem;margin-bottom:1.2rem}
.periodo-buttons{display:flex;gap:.5rem;flex-wrap:wrap}
.periodo-btn{padding:.45rem .9rem;border-radius:20px;border:1px solid var(--line);background:transparent;cursor:pointer;color:var(--mut);transition:.15s}
.periodo-btn:hover{color:var(--txt)}.periodo-btn.active{background:var(--acc);border-color:var(--acc);color:var(--bg2);font-weight:600}
.periodo-custom{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;color:var(--mut)}
input,select,textarea{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;width:100%}
.periodo-custom input{width:auto}
input[type=checkbox]{width:auto}
input:focus,select:focus,textarea:focus{border-color:var(--acc);outline:none}
input[readonly]{opacity:.6}

/* Resumen */
.resumen-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.9rem;margin-bottom:1.4rem}
.resumen-card{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:var(--r);padding:1rem 1.1rem}
.resumen-card h4{font-size:.72rem;font-weight:500;color:var(--mut);letter-spacing:.6px;margin-bottom:.4rem}
.valor{font-size:1.35rem;font-weight:700;font-variant-numeric:tabular-nums}
.positivo{color:var(--ok)}.negativo{color:var(--bad)}

/* Tabs */
.tabs{display:flex;gap:.3rem;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:1.2rem}
.tab-btn{padding:.7rem 1.1rem;background:none;border:none;border-bottom:2px solid transparent;color:var(--mut);cursor:pointer;white-space:nowrap;font-weight:500}
.tab-btn:hover{color:var(--txt)}.tab-btn.active{color:var(--acc);border-bottom-color:var(--acc)}
.tab-content{display:none}.tab-content.active{display:block}

/* Tarjetas de reportes */
.libro-card,.estado-card,.balance-card,.mayor-card,.balance-prueba-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:1.2rem}
.libro-header,.card-header-actions{display:flex;justify-content:space-between;align-items:center;gap:.8rem;flex-wrap:wrap;margin-bottom:1rem}
.libro-header h2,.card-header-actions h2{font-size:1rem;font-weight:600;color:var(--acc)}
.libro-actions{display:flex;gap:.5rem;flex-wrap:wrap}
.libro-actions input,.libro-actions select,.filtro-select{width:auto;min-width:150px}
.loading-state,.empty-message{text-align:center;padding:2.5rem 1rem;color:var(--mut)}
.loading-state i{font-size:1.6rem;color:var(--acc);margin-bottom:.5rem}

.monto-debito{color:var(--ok);text-align:right;font-variant-numeric:tabular-nums}
.monto-credito{color:var(--bad);text-align:right;font-variant-numeric:tabular-nums}
.totales-footer{display:flex;gap:1rem;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem;padding:.9rem 1rem;background:var(--bg2);border-radius:8px}
.estado-cuadre{font-weight:600;font-size:.85rem}.cuadrado{color:var(--ok)}.descuadrado{color:var(--bad)}

/* Asientos */
.asiento-group{border:1px solid var(--line);border-radius:10px;margin-bottom:.6rem;overflow:hidden;background:var(--bg2)}
.asiento-header{display:flex;justify-content:space-between;align-items:center;gap:.8rem;flex-wrap:wrap;padding:.75rem 1rem;cursor:pointer}
.asiento-header:hover{background:rgba(212,165,169,.06)}
.asiento-header-left,.asiento-header-right{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap}
.asiento-numero{font-family:ui-monospace,monospace;font-weight:600;color:var(--acc)}
.asiento-fecha,.asiento-referencia{color:var(--mut);font-size:.8rem}
.asiento-tipo{font-size:.68rem;font-weight:600;padding:.15rem .55rem;border-radius:20px;background:var(--panel2)}
.asiento-estado{font-size:.72rem;padding:.15rem .55rem;border-radius:20px;border:1px solid var(--line)}
.estado-borrador{color:var(--warn)}.estado-contabilizado{color:var(--ok)}.estado-anulado{color:var(--bad)}
.asiento-total{font-weight:700;font-variant-numeric:tabular-nums}
.asiento-actions{display:flex;gap:.3rem}
.btn-accion,.btn-editar,.btn-eliminar,.btn-eliminar-linea{width:30px;height:30px;border-radius:6px;border:1px solid var(--line);background:transparent;color:var(--mut);cursor:pointer;transition:.15s}
.btn-accion:hover,.btn-editar:hover{color:var(--info);border-color:var(--info)}
.btn-contabilizar:hover{color:var(--ok);border-color:var(--ok)}
.btn-delete:hover,.btn-eliminar:hover,.btn-anular:hover,.btn-eliminar-linea:hover{color:var(--bad);border-color:var(--bad)}
.collapse-icon{color:var(--mut);transition:transform .2s}.collapse-icon.rotated{transform:rotate(180deg)}
.asiento-body{border-top:1px solid var(--line)}.asiento-body.collapsed{display:none}

/* Tablas */
.table-responsive{overflow:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:.72rem;font-weight:600;color:var(--mut);letter-spacing:.4px;padding:.6rem .8rem;border-bottom:1px solid var(--line);background:rgba(0,0,0,.12);position:sticky;top:0}
td{padding:.55rem .8rem;border-bottom:1px solid var(--line)}
tbody tr:hover{background:rgba(255,255,255,.02)}
.balance-prueba-table th:nth-child(n+3),.mayor-table th:nth-child(n+5){text-align:right}
.balance-prueba-table td:nth-child(n+3){text-align:right;font-variant-numeric:tabular-nums}
tfoot td{font-weight:700;background:rgba(212,165,169,.08)}
.estado-table td.valor,.estado-table td.pct{text-align:right;font-size:inherit;font-variant-numeric:tabular-nums}
.estado-table td.pct{color:var(--mut);width:90px;font-size:.8rem}
.seccion-titulo{font-weight:700;color:var(--acc);background:rgba(212,165,169,.08);letter-spacing:.4px}
.estado-table .espacio{height:.6rem;border:none}
.estado-table .total-row td{font-weight:700;background:rgba(255,255,255,.04);border-top:1px solid var(--acc)}
.estado-table .sub td:first-child{padding-left:1.8rem}

.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}
.balance-section h3{font-size:.9rem;color:var(--acc);margin-bottom:.6rem}
.total-section{display:flex;justify-content:space-between;padding:.6rem .8rem;margin-top:.4rem;background:var(--bg2);border-radius:8px;font-weight:600}
.total-section.final{border:1px solid var(--acc)}
.cuenta-selector{display:flex;gap:.6rem;margin-bottom:1rem}.cuenta-selector select{flex:1}
.mayor-info-card{background:var(--bg2);border-radius:10px;padding:.9rem 1.1rem;margin-bottom:1rem}
.mayor-info-card h3{color:var(--acc);margin-bottom:.3rem}.mayor-info-card p{color:var(--mut);font-size:.82rem}

/* Modales */
.modal{display:none;position:fixed;inset:0;z-index:100;background:rgba(5,5,15,.72);backdrop-filter:blur(3px);align-items:flex-start;justify-content:center;padding:4vh 1rem;overflow-y:auto}
.modal.active{display:flex}
.modal-content{background:var(--panel);border:1px solid var(--line);border-radius:14px;width:100%;max-width:640px}
.modal-lg{max-width:980px}.modal-sm{max-width:480px}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.3rem;border-bottom:1px solid var(--line)}
.modal-header h2{font-size:1.05rem;font-weight:600}
.close-modal{background:none;border:none;font-size:1.6rem;color:var(--mut);cursor:pointer;line-height:1}.close-modal:hover{color:var(--txt)}
.modal-body{padding:1.3rem}
.modal-footer{display:flex;justify-content:flex-end;gap:.6rem;flex-wrap:wrap;margin-top:1.2rem}
.modal-sm .modal-footer{padding:0 1.3rem 1.3rem;margin:0}
.modal-toolbar{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem}
.modal-toolbar select{width:auto}
.search-input-wrapper{position:relative;flex:1;min-width:200px}
.search-input-wrapper i{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:var(--mut)}
.search-input-wrapper input{padding-left:2.2rem}

.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.form-group{margin-bottom:.9rem}
.form-group label{display:block;font-size:.8rem;color:var(--mut);margin-bottom:.3rem}
.form-group small{display:block;color:var(--mut);font-size:.72rem;margin-top:.25rem}
.required{color:var(--bad)}
.checkbox-group label{display:flex;gap:.5rem;align-items:center;color:var(--txt)}

.lineas-section{margin-top:.6rem}
.lineas-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}
.lineas-header label{font-weight:600}
.lineas-table-wrapper{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
.lineas-table td{padding:.35rem .4rem}.lineas-table input{padding:.4rem .5rem}
.total-lineas{display:flex;gap:1.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:.8rem;font-weight:600}
.total-item{display:flex;gap:.5rem}
.asiento-info-badge,.resumen-asiento{background:var(--bg2);border-radius:8px;padding:.8rem 1rem;margin-bottom:1rem;font-size:.85rem}
.resumen-asiento p{display:flex;justify-content:space-between;margin:.25rem 0}
.warning-text{color:var(--warn);font-size:.82rem;margin-top:1rem}

/* Toasts */
.toast-container{position:fixed;top:1rem;right:1rem;z-index:200;display:flex;flex-direction:column;gap:.5rem}
.toast-alert{background:var(--panel2);border:1px solid var(--line);border-left:4px solid var(--info);border-radius:8px;padding:.7rem 1rem;max-width:380px;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:slideIn .25s ease}
.toast-success{border-left-color:var(--ok)}.toast-error{border-left-color:var(--bad)}.toast-warning{border-left-color:var(--warn)}
@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}

@media(max-width:800px){.container{padding:1rem}.balance-grid,.form-row{grid-template-columns:1fr}.header{padding:.8rem 1rem}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print{.header,.periodo-card,.tabs,.btn-export,.libro-actions,.cuenta-selector{display:none!important}body{background:#fff;color:#000}}
