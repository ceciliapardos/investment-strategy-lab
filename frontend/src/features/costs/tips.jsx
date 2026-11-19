import InfoTip from '../../components/InfoTip'

/** Tooltips educativos del módulo (textos acordados en la especificación de la Fase 5). */
export const TerTip = ({ align }) => (
  <InfoTip title="TER" align={align}>
    Coste interno anual de determinados fondos y ETFs. Su efecto ya está reflejado en el precio histórico del producto.
  </InfoTip>
)

export const CustodyTip = ({ align }) => (
  <InfoTip title="Custodia" align={align}>
    Comisión que algunos intermediarios cobran por mantener los activos.
  </InfoTip>
)

export const FxTip = ({ align }) => (
  <InfoTip title="Cambio de divisa (FX)" align={align}>
    Coste asociado al cambio entre monedas.
  </InfoTip>
)

export const BrokerCostsTip = ({ align }) => (
  <InfoTip title="Costes de intermediación" align={align}>
    Comisiones cobradas por el banco o broker por operar o mantener la inversión.
  </InfoTip>
)

export const ExitTip = ({ align }) => (
  <InfoTip title="Coste estimado de salida" align={align}>
    Lo que costaría vender todas las posiciones el último día del periodo (comisión de venta y, si aplica,
    cambio de divisa). Es una estimación aparte: no se ha pagado durante la inversión.
  </InfoTip>
)
