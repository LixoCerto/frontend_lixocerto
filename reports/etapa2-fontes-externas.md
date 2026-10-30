# Fontes externas — avaliação da Etapa 2

Consulta documental em 30/10/2026. As fontes apoiam somente as afirmações abaixo. Não houve visita nem aferição física de qualquer ponto. Horário em diretório cartográfico e pin de mapa não equivalem a confirmação operacional ou geodésica.

## Ponto cadastrado: EMLUR, João Pessoa

A Prefeitura de João Pessoa informa que a população pode entregar resíduos eletroeletrônicos na sede da EMLUR, na Avenida Minas Gerais, 177, bairro dos Estados. O endereço e a aceitação geral de eletrônicos têm fonte municipal. O horário de segunda a sexta, 8h–14h, foi consultado no Waze e precisa ser confirmado antes da visita. O pin do Google Maps usado no cadastro é −7.114392, −34.859458; é uma localização cartográfica, não medida com GPS na entrada do estabelecimento. O mapa da figura foi obtido do OpenStreetMap, com atribuição aos colaboradores e licença ODbL.

- Prefeitura de João Pessoa, “Recicla JP dá novo destino a resíduos eletrônicos e amplia ações de inclusão social” (29/09/2026): https://joaopessoa.pb.gov.br/noticias/recicla-jp-da-novo-destino-a-residuos-eletronicos-e-amplia-acoes-de-inclusao-social
- Google Maps, ficha EMLUR: https://www.google.com/maps/place/EMLUR+-+Municipal+Urban+Cleaning+Company/@-7.114392,-34.859458,17z/
- Waze, diretório EMLUR: https://www.waze.com/live-map/directions/emlur-av.-minas-gerais-177-joao-pessoa?to=place.w.213059265.2130854793.2798247
- OpenStreetMap, vista centrada no pin: https://www.openstreetmap.org/?mlat=-7.114392&mlon=-34.859458#map=17/-7.114392/-34.859458

**Limite:** a autorização do responsável permitiu o cadastro como “Verificado” na homologação, com a ressalva explícita de pin não aferido. “Verificado” reflete a aprovação cadastral; não comprova posição da entrada, funcionamento atual, coleta realizada ou tratamento final dos resíduos. O código de demonstração reproduz o ponto em fixture local e exibe a ressalva, mas não há comprovação de deploy dessa mudança visual.

## SECITEC — alternativa pesquisada, não usada na demonstração final

A mesma notícia municipal cita o PEV da SECITEC, Rua Estevão Gerson Carneiro da Cunha, 955 — Água Fria, com horário de segunda a sexta, 8h–14h. O Nominatim/OSM retornou um segmento de via, não o edifício ou a entrada do PEV; por isso, essa geocodificação não foi usada para cadastrar um ponto nem para a figura final.

- Página municipal: https://joaopessoa.pb.gov.br/noticias/recicla-jp-da-novo-destino-a-residuos-eletronicos-e-amplia-acoes-de-inclusao-social
- Consulta Nominatim: https://nominatim.openstreetmap.org/search?q=Rua%20Estev%C3%A3o%20Gerson%20Carneiro%20da%20Cunha%2C%20955%2C%20%C3%81gua%20Fria%2C%20Jo%C3%A3o%20Pessoa%2C%20PB%2C%20Brasil&format=jsonv2&limit=3
- Trecho de via retornado: https://www.openstreetmap.org/way/191656636

## Cinco fichas de catálogo verificadas documentalmente

As fichas têm data interna de verificação de 30/09/2026. A revisão das fontes foi editorial, não uma validação de campo nem aprovação administrativa. Cinco temas já apareciam publicados no Guia de homologação; não se alterou a versão remota.

### Compostagem de restos de alimentos com material seco de jardim
- Prefeitura de Joinville — “Como fazer compostagem”: https://www.joinville.sc.gov.br/servicos/como-fazer-compostagem/
- Embrapa Hortaliças — “Compostagem”: https://www.embrapa.br/en/web/hortalicas/hortalica-nao-e-so-salada/secoes/compostagem
- UNIVASF — “O que é compostagem e como fazê-la em casa”: https://portais.univasf.edu.br/sustentabilidade/noticias-sustentaveis/o-que-e-compostagem-e-como-faze-la-em-casa
- A proporção de 2–3 partes de material marrom para 1 de verde é orientação municipal, não norma nacional; minhocário e compostagem termofílica têm requisitos distintos.

### Embalagens de vidro inteiras (garrafas, potes e frascos)
- Prefeitura de Vitória: https://www.vitoria.es.gov.br/noticia/saiba-o-que-pode-e-o-que-nao-pode-ser-descartado-na-coleta-de-vidros-57021
- Prefeitura de Joinville: https://www.joinville.sc.gov.br/noticias/prefeitura-de-joinville-implanta-sistema-de-coleta-de-embalagens-de-vidro/
- Prefeitura de São José dos Campos: https://www.sjc.sp.gov.br/servicos/manutencao-da-cidade/simisa/residuos-solidos/
- Agência Brasília: https://www.agenciabrasilia.df.gov.br/w/saiba-como-e-onde-descartar-embalagens-de-vidro-corretamente
- Há divergência municipal sobre cacos, tampas, rótulos e acondicionamento; a ficha deve restringir-se às embalagens indicadas e remeter à regra local.

### Embalagens plásticas recicláveis da rotina doméstica
- Ministério do Meio Ambiente — “O que é reciclagem?”: https://www.gov.br/mma/pt-br/assuntos/educacao-ambiental/glossario-ea/o-que-e-reciclagem
- Prefeitura de Vitória: https://vitoria.es.gov.br/central/mapa-mostra-onde-descartar-o-lixo-que-pode-ser-reciclado
- Prefeitura de Curitiba: https://www.curitiba.pr.gov.br/noticias/saiba-como-separar-e-destinar-corretamente-o-lixo-que-nao-e-lixo/63175
- eureciclo: https://eureciclo.com.br/blog/5-mitos-do-lixo-domestico
- O aceite depende do município, cooperativa, operador e capacidade local; o símbolo de resina não garante coleta.

### Latas de bebidas e de alimentos (alumínio ou aço)
- Ministério do Meio Ambiente: https://www.gov.br/mma/pt-br/assuntos/educacao-ambiental/glossario-ea/o-que-e-reciclagem
- Prefeitura de Vitória: https://vitoria.es.gov.br/central/mapa-mostra-onde-descartar-o-lixo-que-pode-ser-reciclado
- Prefeitura de Fortaleza: https://www.fortaleza.ce.gov.br/noticias/dia-mundial-da-reciclagem-saiba-como-fazer-o-descarte-correto-do-lixo
- SINIR, “Pilhas e Baterias”: https://sinir.gov.br/perfis/logistica-reversa/logistica-reversa/pilhas-e-baterias/
- SEMA Ceará, logística reversa: https://www.ce.gov.br/sema/residuos-solidos/logistica-reversa/
- SINIR, agrotóxicos: https://sinir.gov.br/perfis/logistica-reversa/logistica-reversa/agrotoxicos-seus-residuos-e-embalagens/
- Latas seguem o fluxo local que as aceita; pilhas, baterias, lâmpadas e embalagens perigosas têm rotas próprias.

### Papel e papelão secos para coleta seletiva
- SLU/DF — “Coleta Seletiva”: https://www.slu.df.gov.br/coletaseletiva
- Prefeitura de Jundiaí — “Como Separar o Lixo”: https://jundiai.sp.gov.br/infraestrutura-e-servicos-publicos/limpeza-publica/residuos-solidos/reciclagem/como-separar-o-lixo/
- Prefeitura de Vitória — “Coleta seletiva”: https://www.vitoria.es.gov.br/central/coleta-seletiva
- As três fontes são locais e divergem sobre guardanapos limpos e secos; o aceite deve ser condicionado à regra municipal/operador.
