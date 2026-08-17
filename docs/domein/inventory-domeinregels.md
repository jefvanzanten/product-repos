# Domeinregels — fysieke voorraad

- Eén `inventory_item` vertegenwoordigt één fysieke gekochte verpakking van één concreet product.
- Maximale inhoud wordt live uit productinhoud afgeleid; resterende inhoud wordt in de basiseenheid van dezelfde dimensie opgeslagen.
- COUNT blijft geheel; massa en volume zijn binnen hun dimensie converteerbaar.
- Een oude partij met aantal N migreert naar N fysieke rijen.
- Volledige items met gelijk product, locatie en THT mogen alleen visueel worden samengevoegd.
- Aangebroken items blijven individueel omdat locatie en resterende inhoud per verpakking kunnen verschillen.
- Totaal verpakkingsequivalent is de som van resterend/maximaal per item en wordt alleen voor presentatie op maximaal één decimaal afgerond.
- Op de THT-dag is een product nog niet verlopen.
- Lage voorraad vergelijkt totale resterende inhoud met een handmatige productdrempel; automatische bewegingssuggesties zijn een latere heuristiek.
- Consumptielogs veranderen voorraad niet automatisch.
