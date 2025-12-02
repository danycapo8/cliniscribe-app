import React from 'react';

interface TermsContentProps {
  language: 'en' | 'es' | 'pt';
}

const renderWithBold = (raw: string) => {
  // Detecta títulos: título principal, fechas, secciones numeradas y bloque de datos
  const headingRegex =
    /^(TÉRMINOS Y CONDICIONES|TERMOS E CONDIÇÕES|TERMS AND CONDITIONS|Fecha de entrada en vigor|Data de entrada em vigor|Effective date|DATOS DEL PROVEEDOR DEL SERVICIO|DADOS DO PRESTADOR DO SERVIÇO|SERVICE PROVIDER INFORMATION|\d+(\.\d+)*\s)/;

  return raw.split('\n').map((line, index) => {
    const trimmed = line.trim();

    // Línea en blanco → mantener separación visual
    if (trimmed === '') {
      return <p key={index} className="h-3" />;
    }

    const isHeading = headingRegex.test(trimmed);

    return (
      <p key={index} className="mb-1">
        {isHeading ? <strong>{line}</strong> : line}
      </p>
    );
  });
};

export const TermsContent: React.FC<TermsContentProps> = ({ language }) => {
  // ESPAÑOL – Texto legal completo
  const rawES = `TÉRMINOS Y CONDICIONES DE USO DE CLINISCRIBE PARA PRESTADORES DE SALUD

Fecha de entrada en vigor: 28 de noviembre de 2025

Estos Términos y Condiciones de Uso (los “Términos”) regulan el acceso y uso de la plataforma CliniScribe (el “Servicio”) por parte de profesionales y prestadores de servicios de salud que utilizan la solución disponible, entre otros, en el sitio web www.cliniscribe.io/providers (el “Sitio”).

Al crear una cuenta o utilizar el Servicio, usted (“el Usuario”, “el Profesional” o “el Prestador”) declara haber leído, entendido y aceptado estos Términos.



1. Objeto y naturaleza del Servicio

1.1 CliniScribe es una herramienta de software de asistencia clínica (“copiloto”) basada en inteligencia artificial, diseñada para apoyar a profesionales de la salud en la documentación clínica (por ejemplo, generación de borradores de notas en formato SOAP a partir de audio y texto).

1.2 CliniScribe NO es un dispositivo médico, NO presta servicios médicos ni de telemedicina, NO realiza diagnósticos, NO indica tratamientos y NO sustituye el juicio clínico profesional.

1.3 El Servicio opera como una herramienta de apoyo: analiza el audio y/o texto que el Profesional introduce y genera borradores y sugerencias que pueden ser útiles para la redacción de la ficha clínica u otros documentos médicos. Dichos borradores:

Tienen carácter orientativo únicamente.

Pueden contener errores, omisiones, sesgos o información incorrecta (“alucinaciones”).

No deben incorporarse directamente a registros médicos oficiales sin revisión previa.

1.4 Al usar el Servicio, el Profesional reconoce y acepta que es el único y exclusivo responsable de:

Validar la información generada por CliniScribe.

Corregir, completar y aprobar el texto antes de incorporarlo a cualquier registro médico, ficha clínica, certificado, receta u otro documento.

Tomar todas las decisiones clínicas basadas en su propio criterio profesional y en las normas aplicables a su ejercicio.



2. Destinatarios y requisitos de uso

2.1 El Servicio está dirigido exclusivamente a profesionales y prestadores de servicios de salud (por ejemplo, médicos, clínicas, centros médicos) que utilicen CliniScribe en el ejercicio de su actividad profesional.

2.2 El Servicio no está destinado al público general ni a pacientes. CliniScribe no establece en ningún caso una relación médico–paciente con los usuarios finales atendidos por el Profesional.

2.3 El Profesional declara y garantiza que:

Cuenta con título profesional, certificaciones y licencias vigentes necesarias para ejercer la medicina o la profesión de salud correspondiente en su jurisdicción.

Utilizará el Servicio únicamente en el marco de su actividad profesional legítima y conforme a la normativa sanitaria y de protección de datos aplicable.

CliniScribe podrá suspender o cancelar el acceso si tiene indicios razonables de incumplimiento de estas condiciones.



3. Uso del Servicio y responsabilidades del Profesional

3.1 Como condición indispensable para el uso del Servicio, el Profesional se compromete a:

a) Validar y revisar todo contenido generado por la IA (incluyendo síntesis clínicas, diagnósticos sugeridos, posibles medicamentos o dosis, alertas de seguridad y cualquier otro texto).

b) No delegar decisiones clínicas en el Servicio. CliniScribe no presta asesoría médica ni reemplaza segundas opiniones, guías clínicas ni normativa oficial.

c) Obtener una base legal válida (por ejemplo, consentimiento informado o la habilitación prevista en la ley) para tratar y comunicar a CliniScribe los datos personales y datos sensibles de sus pacientes, según la normativa de protección de datos aplicable en su país.

d) No introducir datos innecesarios o excesivos: el Profesional se compromete a limitar la información a la estrictamente necesaria para el objetivo clínico, evitando datos que no aporten valor asistencial.

3.2 El Profesional será el único responsable ante sus pacientes, autoridades y terceros por:

La calidad, exactitud y completitud de la documentación final que incorpore a la ficha clínica o a cualquier sistema de registro médico.

Cualquier acto de mala praxis, diagnóstico erróneo, tratamiento inadecuado, omisión de información relevante o daño que se derive de la atención realizada, independientemente del uso del Servicio.



4. Cuenta de usuario y seguridad

4.1 Para utilizar el Servicio, es posible que el Profesional deba crear una cuenta, proporcionando ciertos datos básicos (por ejemplo, nombre, correo electrónico, profesión o especialidad).

4.2 El Profesional se compromete a:

Mantener la confidencialidad de sus credenciales de acceso (usuario y contraseña).

No compartir su cuenta con terceros.

Notificar a CliniScribe de inmediato ante cualquier uso no autorizado o sospecha de vulneración de su cuenta.

4.3 El Profesional será responsable por toda actividad que se realice bajo sus credenciales hasta que comunique formalmente cualquier uso indebido.



5. Tratamiento de datos personales y de salud

5.1 Rol de CliniScribe

5.1.1 En lo relativo a los datos personales y de salud de los pacientes del Profesional, CliniScribe actúa como un proveedor tecnológico (encargado de tratamiento o figura equivalente según la legislación aplicable), procesando datos siguiendo las instrucciones del Profesional y únicamente para prestar el Servicio.

5.1.2 El Profesional es el responsable del tratamiento frente a sus pacientes y autoridades, y deberá cumplir con toda la normativa de protección de datos y confidencialidad de la información de salud.

5.2 No almacenamiento en la nube de notas clínicas

5.2.1 CliniScribe ha sido diseñada bajo un enfoque “privacy-first”. En la versión actual del Servicio:

CliniScribe no almacena de manera persistente en la nube las notas clínicas, transcripciones completas ni el contenido detallado de las consultas de los pacientes.

El contenido clínico (texto generado, borradores de notas, resúmenes) se mantiene principalmente en el navegador del Profesional, de forma temporal, para que este pueda revisarlo, editarlo, copiarlo o integrarlo en su propio sistema de ficha clínica.

5.2.2 El Profesional es responsable de:

Guardar la documentación clínica final en su propio sistema de registro médico o ficha clínica institucional.

Implementar las medidas necesarias para la protección y respaldo de los registros médicos fuera de CliniScribe.

5.3 Proveedores de servicios tecnológicos y procesamiento de IA

5.3.1 Para poder transformar audio y texto en borradores de notas clínicas, CliniScribe puede requerir el procesamiento temporal de fragmentos de audio y/o texto por parte de proveedores de servicios de inteligencia artificial y de infraestructura en la nube (“Subencargados”).

5.3.2 Dicho procesamiento se realiza:

A través de canales cifrados.

Solo durante el tiempo estrictamente necesario para generar la respuesta.

Sin que CliniScribe almacene de forma persistente las notas clínicas en sus propios servidores.

5.3.3 CliniScribe no utiliza la información clínica de los pacientes:

Para entrenar modelos de terceros.

Para entrenar modelos propios que permita identificar a pacientes.

Ni para fines comerciales diferentes de la prestación del Servicio al Profesional.

5.3.4 La lista actualizada de principales proveedores tecnológicos (por ejemplo, proveedores de infraestructura en la nube, servicios de transcripción de audio, modelos de lenguaje) estará disponible en la documentación del producto o en el Sitio, y podrá actualizarse en el tiempo para mejorar el Servicio, manteniendo estándares de seguridad equivalentes o superiores.

5.3.5 Es posible que algunos proveedores procesen datos en otros países. El Profesional, al usar el Servicio, autoriza dichas transferencias internacionales en la medida en que sean necesarias para prestar el Servicio, y CliniScribe se compromete a exigir a dichos proveedores obligaciones contractuales de confidencialidad y seguridad.

5.4 Seguridad

5.4.1 CliniScribe implementa medidas técnicas y organizativas razonables para proteger la confidencialidad, integridad y disponibilidad de la información que procesa.

5.4.2 No obstante, ningún sistema es completamente inmune a incidentes de seguridad. El Profesional reconoce este riesgo inherente al uso de tecnologías digitales y se compromete a:

Utilizar dispositivos y redes seguras.

Cumplir buenas prácticas de seguridad (actualización de software, contraseñas robustas, etc.).



6. Propiedad intelectual y licencia de uso

6.1 CliniScribe y/o sus desarrolladores conservan todos los derechos de propiedad intelectual e industrial sobre:

El código fuente, algoritmos, modelos de interacción y configuración del Servicio.

La interfaz de usuario, diseños, marcas, logos y nombres comerciales.

La documentación técnica y materiales asociados.

6.2 El Profesional conserva la titularidad y responsabilidad sobre la información clínica que introduce en el Servicio y sobre los documentos que eventualmente genere utilizando CliniScribe, una vez que los exporta, copia o integra en su propia ficha clínica.

6.3 CliniScribe otorga al Profesional una licencia limitada, no exclusiva, intransferible y revocable para utilizar el Servicio durante la vigencia de su suscripción y únicamente para fines profesionales legítimos, conforme a estos Términos.

6.4 El Profesional se compromete a no realizar:

Ingeniería inversa, descompilación o acceso no autorizado al código fuente del Servicio.

Uso del Servicio para desarrollar, entrenar o mejorar productos que compitan directamente con CliniScribe, salvo autorización expresa por escrito.



7. Uso prohibido del Servicio

El Profesional se obliga a no utilizar el Servicio para:

Actividades ilícitas, fraudulentas o contrarias a la normativa sanitaria o de protección de datos.

Introducir deliberadamente malware, código malicioso o contenido que pueda dañar la infraestructura de CliniScribe o de terceros.

Suplantar la identidad de otra persona o prestar información falsa sobre su titulación o habilitación profesional.

El incumplimiento de estas obligaciones puede dar lugar a la suspensión o terminación inmediata del acceso al Servicio.



8. Limitación de responsabilidad

8.1 En la máxima medida permitida por la ley aplicable, CliniScribe, sus desarrolladores, afiliados y proveedores no serán responsables frente al Profesional ni frente a terceros por:

Daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del Servicio.

Reclamaciones por mala praxis médica, diagnósticos erróneos, tratamientos inadecuados o cualquier daño a pacientes, aun cuando el Profesional haya utilizado borradores generados por la IA.

Pérdida de datos, interrupción del negocio, lucro cesante o pérdida de oportunidades comerciales.

8.2 El Servicio se proporciona “TAL CUAL” (“AS IS”) y “SEGÚN DISPONIBILIDAD”, sin garantías de ningún tipo, expresas o implícitas, incluyendo, entre otras, garantías de funcionamiento ininterrumpido, exactitud, idoneidad para un propósito particular o ausencia de errores.

8.3 Nada de lo dispuesto en esta cláusula excluye ni limita la responsabilidad de CliniScribe en caso de dolo o culpa grave, en la medida en que dicha exclusión no esté permitida por la ley aplicable.

8.4 CliniScribe no presta servicios médicos, de telemedicina ni de atención directa a pacientes, y no establece en ningún caso una relación médico–paciente con los usuarios finales del Profesional.



9. Modificaciones del Servicio y de los Términos

9.1 CliniScribe podrá introducir mejoras, cambios o nuevas funcionalidades en el Servicio, así como limitar, suspender o interrumpir temporalmente determinadas características por razones técnicas, de seguridad o de mantenimiento.

9.2 CliniScribe se reserva el derecho de modificar estos Términos en cualquier momento. Cuando se realicen cambios sustanciales, se procurará notificar al Profesional mediante aviso en el Sitio y/o por correo electrónico con una antelación razonable, salvo que la normativa exija una aplicación inmediata.

9.3 El uso continuado del Servicio tras la entrada en vigor de las modificaciones supone la aceptación de los nuevos Términos. En caso de no estar de acuerdo, el Profesional deberá dejar de utilizar el Servicio y solicitar la cancelación de su cuenta.



10. Terminación

10.1 El Profesional podrá dejar de utilizar el Servicio en cualquier momento y solicitar la cancelación de su cuenta. Salvo que los términos comerciales de un plan específico dispongan lo contrario, la cancelación no generará derecho a reembolsos por períodos ya pagados.

10.2 CliniScribe podrá suspender o terminar el acceso del Profesional, de forma total o parcial, cuando:

Exista incumplimiento grave o reiterado de estos Términos (en especial, en materia de uso indebido de datos de pacientes, falta de habilitación profesional o uso ilícito del Servicio).

Haya requerimientos de autoridad competente que así lo exijan.



11. Legislación aplicable y jurisdicción

11.1 Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Chile, sin perjuicio de las normas de orden público sanitario o de protección de datos que deban aplicarse en la jurisdicción del Profesional.

11.2 Cualquier controversia relacionada con la validez, interpretación o ejecución de estos Términos se someterá a los tribunales ordinarios de justicia con asiento en la ciudad de Santiago de Chile, salvo que una normativa imperativa disponga otro fuero.



12. Disposiciones generales

12.1 Si alguna disposición de estos Términos fuese declarada nula, ilegal o inaplicable por un tribunal competente, dicha disposición se considerará eliminada o limitada en la medida necesaria, sin afectar la validez del resto de las cláusulas.

12.2 El hecho de que CliniScribe no ejerza un derecho o acción derivado de estos Términos no constituirá una renuncia al mismo.



DATOS DEL PROVEEDOR DEL SERVICIO

Razón Social: SiemprePro SpA

RUT: 78.117.275-8

Domicilio: Cerro el Plomo 5931, oficina 1213, Las Condes, Región Metropolitana, Chile

Correo de contacto: support@cliniscribe.io`;

  // PORTUGUÉS – Texto legal completo
  const rawPT = `TERMOS E CONDIÇÕES DE USO DA CLINISCRIBE PARA PRESTADORES DE SERVIÇOS DE SAÚDE

Data de entrada em vigor: 28 de novembro de 2025

Estes Termos e Condições de Uso (os “Termos”) regulam o acesso e o uso da plataforma CliniScribe (o “Serviço”) por parte de profissionais e prestadores de serviços de saúde que utilizam a solução disponível, entre outros, no site www.cliniscribe.io/providers
 (o “Site”).

Ao criar uma conta ou utilizar o Serviço, você (“o Usuário”, “o Profissional” ou “o Prestador”) declara ter lido, compreendido e aceito estes Termos.

1. Objeto e natureza do Serviço

1.1 A CliniScribe é uma ferramenta de software de assistência clínica (“copiloto”) baseada em inteligência artificial, concebida para apoiar profissionais de saúde na documentação clínica (por exemplo, geração de rascunhos de notas em formato SOAP a partir de áudio e texto).

1.2 A CliniScribe NÃO é um dispositivo médico, NÃO presta serviços médicos nem de telemedicina, NÃO realiza diagnósticos, NÃO indica tratamentos e NÃO substitui o julgamento clínico profissional.

1.3 O Serviço opera como uma ferramenta de apoio: analisa o áudio e/ou o texto que o Profissional introduz e gera rascunhos e sugestões que podem ser úteis para a redação do prontuário clínico ou de outros documentos médicos. Tais rascunhos:

Têm caráter meramente orientativo.

Podem conter erros, omissões, vieses ou informações incorretas (“alucinações”).

Não devem ser incorporados diretamente a registros médicos oficiais sem revisão prévia.

1.4 Ao usar o Serviço, o Profissional reconhece e aceita que é o único e exclusivo responsável por:

Validar as informações geradas pela CliniScribe.

Corrigir, completar e aprovar o texto antes de incorporá-lo a qualquer registro médico, prontuário clínico, certificado, receita ou outro documento.

Tomar todas as decisões clínicas com base em seu próprio critério profissional e nas normas aplicáveis ao seu exercício.

2. Destinatários e requisitos de uso

2.1 O Serviço é dirigido exclusivamente a profissionais e prestadores de serviços de saúde (por exemplo, médicos, clínicas, centros médicos) que utilizem a CliniScribe no exercício de sua atividade profissional.

2.2 O Serviço não se destina ao público em geral nem a pacientes. A CliniScribe não estabelece, em nenhum caso, uma relação médico–paciente com os usuários finais atendidos pelo Profissional.

2.3 O Profissional declara e garante que:

Possui o título profissional, certificações e licenças vigentes necessárias para exercer a medicina ou a profissão de saúde correspondente em sua jurisdição.

Utilizará o Serviço apenas no âmbito de sua atividade profissional legítima e em conformidade com a normativa sanitária e de proteção de dados aplicável.

A CliniScribe poderá suspender ou cancelar o acesso se tiver indícios razoáveis de descumprimento destas condições.

3. Uso do Serviço e responsabilidades do Profissional

3.1 Como condição indispensável para o uso do Serviço, o Profissional se compromete a:

a) Validar e revisar todo o conteúdo gerado pela IA (incluindo sínteses clínicas, diagnósticos sugeridos, possíveis medicamentos ou doses, alertas de segurança e qualquer outro texto).

b) Não delegar decisões clínicas ao Serviço. A CliniScribe não presta assessoria médica nem substitui segundas opiniões, diretrizes clínicas ou normativa oficial.

c) Obter uma base jurídica válida (por exemplo, consentimento informado ou a autorização prevista em lei) para tratar e comunicar à CliniScribe os dados pessoais e dados sensíveis de seus pacientes, conforme a normativa de proteção de dados aplicável em seu país.

d) Não introduzir dados desnecessários ou excessivos: o Profissional se compromete a limitar a informação ao estritamente necessário para o objetivo clínico, evitando dados que não agreguem valor assistencial.

3.2 O Profissional será o único responsável perante seus pacientes, autoridades e terceiros por:

A qualidade, exatidão e completude da documentação final que venha a incorporar ao prontuário clínico ou a qualquer sistema de registro médico.

Qualquer ato de má prática, diagnóstico equivocado, tratamento inadequado, omissão de informação relevante ou dano decorrente do atendimento realizado, independentemente do uso do Serviço.

4. Conta de usuário e segurança

4.1 Para utilizar o Serviço, é possível que o Profissional deva criar uma conta, fornecendo determinados dados básicos (por exemplo, nome, e-mail, profissão ou especialidade).

4.2 O Profissional se compromete a:

Manter a confidencialidade de suas credenciais de acesso (usuário e senha).

Não compartilhar sua conta com terceiros.

Notificar imediatamente a CliniScribe em caso de qualquer uso não autorizado ou suspeita de violação de sua conta.

4.3 O Profissional será responsável por toda atividade realizada sob suas credenciais até que comunique formalmente qualquer uso indevido.

5. Tratamento de dados pessoais e de saúde

5.1 Papel da CliniScribe

5.1.1 No que diz respeito aos dados pessoais e de saúde dos pacientes do Profissional, a CliniScribe atua como fornecedor tecnológico (operador de tratamento ou figura equivalente, de acordo com a legislação aplicável), processando dados conforme as instruções do Profissional e unicamente para prestar o Serviço.

5.1.2 O Profissional é o responsável pelo tratamento perante seus pacientes e autoridades, devendo cumprir toda a normativa de proteção de dados e de confidencialidade das informações de saúde.

5.2 Não armazenamento em nuvem de notas clínicas

5.2.1 A CliniScribe foi concebida sob uma abordagem “privacy-first”. Na versão atual do Serviço:

A CliniScribe não armazena de forma persistente na nuvem as notas clínicas, transcrições completas nem o conteúdo detalhado das consultas dos pacientes.

O conteúdo clínico (texto gerado, rascunhos de notas, resumos) é mantido principalmente no navegador do Profissional, de forma temporária, para que este possa revisá-lo, editá-lo, copiá-lo ou integrá-lo em seu próprio sistema de prontuário clínico.

5.2.2 O Profissional é responsável por:

Guardar a documentação clínica final em seu próprio sistema de registro médico ou prontuário clínico institucional.

Implementar as medidas necessárias para a proteção e o respaldo dos registros médicos fora da CliniScribe.

5.3 Fornecedores de serviços tecnológicos e processamento de IA

5.3.1 Para poder transformar áudio e texto em rascunhos de notas clínicas, a CliniScribe pode exigir o processamento temporário de trechos de áudio e/ou texto por parte de fornecedores de serviços de inteligência artificial e de infraestrutura em nuvem (“Subencarregados”).

5.3.2 Esse processamento é realizado:

Por meio de canais cifrados.

Somente durante o tempo estritamente necessário para gerar a resposta.

Sem que a CliniScribe armazene de forma persistente as notas clínicas em seus próprios servidores.

5.3.3 A CliniScribe não utiliza as informações clínicas dos pacientes:

Para treinar modelos de terceiros.

Para treinar modelos próprios de forma que permita identificar pacientes.

Nem para fins comerciais diferentes da prestação do Serviço ao Profissional.

5.3.4 A lista atualizada dos principais fornecedores tecnológicos (por exemplo, fornecedores de infraestrutura em nuvem, serviços de transcrição de áudio, modelos de linguagem) estará disponível na documentação do produto ou no Site, e poderá ser atualizada ao longo do tempo para melhorar o Serviço, mantendo padrões de segurança equivalentes ou superiores.

5.3.5 É possível que alguns fornecedores processem dados em outros países. Ao usar o Serviço, o Profissional autoriza tais transferências internacionais na medida em que sejam necessárias para prestar o Serviço, e a CliniScribe se compromete a exigir desses fornecedores obrigações contratuais de confidencialidade e segurança.

5.4 Segurança

5.4.1 A CliniScribe implementa medidas técnicas e organizacionais razoáveis para proteger a confidencialidade, integridade e disponibilidade das informações que processa.

5.4.2 Não obstante, nenhum sistema é completamente imune a incidentes de segurança. O Profissional reconhece esse risco inerente ao uso de tecnologias digitais e se compromete a:

Utilizar dispositivos e redes seguros.

Cumprir boas práticas de segurança (atualização de software, senhas robustas etc.).

6. Propriedade intelectual e licença de uso

6.1 A CliniScribe e/ou seus desenvolvedores conservam todos os direitos de propriedade intelectual e industrial sobre:

O código-fonte, algoritmos, modelos de interação e configuração do Serviço.

A interface do usuário, designs, marcas, logotipos e nomes comerciais.

A documentação técnica e materiais associados.

6.2 O Profissional mantém a titularidade e a responsabilidade sobre as informações clínicas que introduz no Serviço e sobre os documentos que eventualmente gerar utilizando a CliniScribe, uma vez que os exporte, copie ou integre em seu próprio prontuário clínico.

6.3 A CliniScribe concede ao Profissional uma licença limitada, não exclusiva, intransferível e revogável para utilizar o Serviço durante a vigência de sua assinatura e unicamente para fins profissionais legítimos, de acordo com estes Termos.

6.4 O Profissional se compromete a não realizar:

Engenharia reversa, descompilação ou acesso não autorizado ao código-fonte do Serviço.

Uso do Serviço para desenvolver, treinar ou melhorar produtos que concorram diretamente com a CliniScribe, salvo autorização expressa e por escrito.

7. Uso proibido do Serviço

O Profissional se obriga a não utilizar o Serviço para:

Atividades ilícitas, fraudulentas ou contrárias à normativa sanitária ou de proteção de dados.

Introduzir deliberadamente malware, código malicioso ou conteúdo que possa danificar a infraestrutura da CliniScribe ou de terceiros.

Assumir a identidade de outra pessoa ou fornecer informações falsas sobre sua titulação ou habilitação profissional.

O descumprimento dessas obrigações pode acarretar a suspensão ou a rescisão imediata do acesso ao Serviço.

8. Limitação de responsabilidade

8.1 Na máxima medida permitida pela legislação aplicável, a CliniScribe, seus desenvolvedores, afiliadas e fornecedores não serão responsáveis perante o Profissional nem perante terceiros por:

Danos diretos, indiretos, incidentais, especiais ou consequentes decorrentes do uso ou da impossibilidade de uso do Serviço.

Reclamações por má prática médica, diagnósticos equivocados, tratamentos inadequados ou qualquer dano a pacientes, ainda que o Profissional tenha utilizado rascunhos gerados pela IA.

Perda de dados, interrupção de negócios, perda de lucros ou perda de oportunidades comerciais.

8.2 O Serviço é fornecido “NO ESTADO EM QUE SE ENCONTRA” (“AS IS”) e “CONFORME A DISPONIBILIDADE”, sem garantias de qualquer tipo, expressas ou implícitas, incluindo, entre outras, garantias de funcionamento ininterrupto, exatidão, adequação a um propósito específico ou ausência de erros.

8.3 Nada do disposto nesta cláusula exclui nem limita a responsabilidade da CliniScribe em caso de dolo ou culpa grave, na medida em que tal exclusão não seja permitida pela legislação aplicável.

8.4 A CliniScribe não presta serviços médicos, de telemedicina nem de atendimento direto a pacientes e não estabelece, em nenhum caso, uma relação médico–paciente com os usuários finais do Profissional.

9. Modificações do Serviço e dos Termos

9.1 A CliniScribe poderá introduzir melhorias, alterações ou novas funcionalidades no Serviço, bem como limitar, suspender ou interromper temporariamente determinadas características por motivos técnicos, de segurança ou de manutenção.

9.2 A CliniScribe reserva-se o direito de modificar estes Termos a qualquer momento. Quando forem realizadas alterações substanciais, envidar-se-ão esforços para notificar o Profissional por meio de aviso no Site e/ou por e-mail com antecedência razoável, salvo quando a normativa exigir aplicação imediata.

9.3 O uso continuado do Serviço após a entrada em vigor das modificações implica a aceitação dos novos Termos. Em caso de discordância, o Profissional deverá deixar de utilizar o Serviço e solicitar o cancelamento de sua conta.

10. Rescisão

10.1 O Profissional poderá deixar de utilizar o Serviço a qualquer momento e solicitar o cancelamento de sua conta. Salvo disposição em contrário nos termos comerciais de um plano específico, o cancelamento não gerará direito a reembolso por períodos já pagos.

10.2 A CliniScribe poderá suspender ou encerrar o acesso do Profissional, total ou parcialmente, quando:

Houver descumprimento grave ou reiterado destes Termos (em especial, quanto ao uso indevido de dados de pacientes, falta de habilitação profissional ou uso ilícito do Serviço).

Houver solicitações de autoridade competente que assim o exijam.

11. Legislação aplicável e jurisdição

11.1 Estes Termos serão regidos e interpretados de acordo com as leis da República do Chile, sem prejuízo das normas de ordem pública sanitária ou de proteção de dados que devam ser aplicadas na jurisdição do Profissional.

11.2 Qualquer controvérsia relacionada com a validade, interpretação ou execução destes Termos será submetida aos tribunais ordinários de justiça com sede na cidade de Santiago do Chile, salvo se uma normativa imperativa estabelecer foro diverso.

12. Disposições gerais

12.1 Se alguma disposição destes Termos for declarada nula, ilegal ou inaplicável por um tribunal competente, tal disposição será considerada eliminada ou limitada na medida necessária, sem afetar a validade das demais cláusulas.

12.2 O fato de a CliniScribe não exercer um direito ou ação decorrente destes Termos não constituirá renúncia a esse direito ou ação.

DADOS DO PRESTADOR DO SERVIÇO

Razão social: SiemprePro SpA

RUT: 78.117.275-8

Endereço: Cerro el Plomo 5931, oficina 1213, Las Condes, Região Metropolitana, Chile

E-mail de contato: support@cliniscribe.io`;

  // INGLÉS – Texto legal completo
  const rawEN = `TERMS AND CONDITIONS OF USE OF CLINISCRIBE FOR HEALTHCARE PROVIDERS

Effective date: 28 November 2025

These Terms and Conditions of Use (the "Terms") govern access to and use of the CliniScribe platform (the "Service") by healthcare professionals and providers who use the solution available, among others, on the website www.cliniscribe.io/providers
 (the "Site").

By creating an account or using the Service, you (the "User", the "Professional" or the "Provider") declare that you have read, understood and accepted these Terms.

1. Object and nature of the Service

1.1 CliniScribe is an artificial intelligence-based clinical assistance software tool (a "co-pilot") designed to support healthcare professionals in clinical documentation (for example, generating draft SOAP-format notes from audio and text).

1.2 CliniScribe IS NOT a medical device, DOES NOT provide medical or telemedicine services, DOES NOT make diagnoses, DOES NOT prescribe treatments and DOES NOT replace professional clinical judgment.

1.3 The Service operates as a support tool: it analyzes the audio and/or text that the Professional inputs and generates drafts and suggestions that may be useful for drafting the medical record or other medical documents. Such drafts:

Are for guidance purposes only.

May contain errors, omissions, biases or incorrect information ("hallucinations").

Must not be incorporated directly into official medical records without prior review.

1.4 By using the Service, the Professional acknowledges and agrees that he/she is the sole and exclusive party responsible for:

Validating the information generated by CliniScribe.

Correcting, completing and approving the text before incorporating it into any medical record, chart, certificate, prescription or other document.

Taking all clinical decisions based on his/her own professional judgment and the regulations applicable to his/her practice.

2. Intended users and usage requirements

2.1 The Service is intended exclusively for healthcare professionals and providers (for example, physicians, clinics, medical centers) who use CliniScribe in the course of their professional activity.

2.2 The Service is not intended for the general public or for patients. CliniScribe does not in any case establish a doctor–patient relationship with the end users treated by the Professional.

2.3 The Professional represents and warrants that he/she:

Holds the professional degree, certifications and valid licenses required to practice medicine or the relevant health profession in his/her jurisdiction.

Will use the Service solely in the context of his/her legitimate professional activity and in accordance with the applicable health and data protection regulations.

CliniScribe may suspend or cancel access if it has reasonable indications of non-compliance with these conditions.

3. Use of the Service and responsibilities of the Professional

3.1 As an indispensable condition for the use of the Service, the Professional undertakes to:

a) Validate and review all content generated by the AI (including clinical summaries, suggested diagnoses, possible medications or dosages, safety alerts and any other text).

b) Not delegate clinical decisions to the Service. CliniScribe does not provide medical advice and does not replace second opinions, clinical guidelines or official regulations.

c) Obtain a valid legal basis (for example, informed consent or the legal grounds provided for by law) to process and communicate to CliniScribe the personal data and sensitive data of his/her patients, in accordance with the data protection regulations applicable in his/her country.

d) Not input unnecessary or excessive data: the Professional undertakes to limit the information to that which is strictly necessary for the clinical objective, avoiding data that do not add care value.

3.2 The Professional shall be solely responsible before his/her patients, authorities and third parties for:

The quality, accuracy and completeness of the final documentation that he/she incorporates into the medical record or any medical record-keeping system.

Any act of malpractice, erroneous diagnosis, inadequate treatment, omission of relevant information or damage arising from the care provided, regardless of the use of the Service.

4. User account and security

4.1 To use the Service, the Professional may be required to create an account, providing certain basic data (for example, name, email address, profession or specialty).

4.2 The Professional undertakes to:

Maintain the confidentiality of his/her access credentials (username and password).

Not share his/her account with third parties.

Notify CliniScribe immediately of any unauthorized use or suspected breach of his/her account.

4.3 The Professional shall be responsible for all activity carried out under his/her credentials until he/she formally reports any misuse.

5. Processing of personal and health data
5.1 Role of CliniScribe

5.1.1 With regard to the personal and health data of the Professional’s patients, CliniScribe acts as a technology provider (data processor or equivalent figure under the applicable legislation), processing data in accordance with the Professional’s instructions and solely for the purpose of providing the Service.

5.1.2 The Professional is the data controller vis-à-vis his/her patients and the authorities and must comply with all regulations on data protection and confidentiality of health information.

5.2 No cloud storage of clinical notes

5.2.1 CliniScribe has been designed with a "privacy-first" approach. In the current version of the Service:

CliniScribe does not persistently store in the cloud clinical notes, complete transcriptions or the detailed content of patients’ consultations.

Clinical content (generated text, draft notes, summaries) is kept mainly in the Professional’s browser, on a temporary basis, so that he/she can review, edit, copy or integrate it into his/her own medical record system.

5.2.2 The Professional is responsible for:

Saving the final clinical documentation in his/her own medical record-keeping system or institutional chart.

Implementing the necessary measures for the protection and backup of medical records outside CliniScribe.

5.3 Technology service providers and AI processing

5.3.1 In order to transform audio and text into draft clinical notes, CliniScribe may require the temporary processing of audio and/or text segments by artificial intelligence service providers and cloud infrastructure providers ("Sub-processors").

5.3.2 Such processing is carried out:

Through encrypted channels.

Only for the time strictly necessary to generate the response.

Without CliniScribe persistently storing clinical notes on its own servers.

5.3.3 CliniScribe does not use patients’ clinical information:

To train third-party models.

To train its own models in a way that would allow patients to be identified.

Nor for commercial purposes other than the provision of the Service to the Professional.

5.3.4 The updated list of main technology providers (for example, cloud infrastructure providers, audio transcription services, language models) will be available in the product documentation or on the Site, and may be updated over time to improve the Service, maintaining equivalent or higher security standards.

5.3.5 It is possible that some providers may process data in other countries. By using the Service, the Professional authorizes such international transfers insofar as they are necessary to provide the Service, and CliniScribe undertakes to require such providers to assume contractual obligations of confidentiality and security.

5.4 Security

5.4.1 CliniScribe implements reasonable technical and organizational measures to protect the confidentiality, integrity and availability of the information it processes.

5.4.2 However, no system is completely immune to security incidents. The Professional acknowledges this inherent risk in the use of digital technologies and undertakes to:

Use secure devices and networks.

Follow good security practices (software updates, strong passwords, etc.).

6. Intellectual property and license of use

6.1 CliniScribe and/or its developers retain all intellectual and industrial property rights over:

The source code, algorithms, interaction models and configuration of the Service.

The user interface, designs, trademarks, logos and trade names.

The technical documentation and related materials.

6.2 The Professional retains ownership of and responsibility for the clinical information that he/she inputs into the Service and for the documents that he/she may generate using CliniScribe once he/she exports, copies or integrates them into his/her own medical record.

6.3 CliniScribe grants the Professional a limited, non-exclusive, non-transferable and revocable license to use the Service during the term of his/her subscription and solely for legitimate professional purposes, in accordance with these Terms.

6.4 The Professional undertakes not to:

Reverse engineer, decompile or gain unauthorized access to the Service’s source code.

Use the Service to develop, train or improve products that directly compete with CliniScribe, unless expressly authorized in writing.

7. Prohibited use of the Service

The Professional undertakes not to use the Service for:

Unlawful or fraudulent activities or activities contrary to health or data protection regulations.

Deliberately introducing malware, malicious code or content that could damage the infrastructure of CliniScribe or third parties.

Impersonating another person or providing false information about his/her degree or professional authorization.

Breach of these obligations may result in immediate suspension or termination of access to the Service.

8. Limitation of liability

8.1 To the fullest extent permitted by applicable law, CliniScribe, its developers, affiliates and providers shall not be liable to the Professional or to third parties for:

Direct, indirect, incidental, special or consequential damages arising from the use or inability to use the Service.

Claims for medical malpractice, erroneous diagnoses, inadequate treatments or any harm to patients, even when the Professional has used drafts generated by the AI.

Loss of data, business interruption, loss of profits or loss of business opportunities.

8.2 The Service is provided "AS IS" and "AS AVAILABLE", without warranties of any kind, express or implied, including, without limitation, warranties of uninterrupted operation, accuracy, fitness for a particular purpose or absence of errors.

8.3 Nothing in this clause shall exclude or limit CliniScribe’s liability in cases of willful misconduct or gross negligence, to the extent that such exclusion is not permitted under applicable law.

8.4 CliniScribe does not provide medical services, telemedicine or direct patient care, and does not in any case establish a doctor–patient relationship with the end users of the Professional.

9. Modifications of the Service and of the Terms

9.1 CliniScribe may introduce improvements, changes or new functionalities in the Service, as well as limit, suspend or temporarily interrupt certain features for technical, security or maintenance reasons.

9.2 CliniScribe reserves the right to amend these Terms at any time. When substantial changes are made, efforts will be made to notify the Professional by means of a notice on the Site and/or by email with reasonable advance notice, except where regulations require immediate application.

9.3 Continued use of the Service after the entry into force of the modifications shall constitute acceptance of the new Terms. If the Professional does not agree, he/she must stop using the Service and request cancellation of his/her account.

10. Termination

10.1 The Professional may stop using the Service at any time and request cancellation of his/her account. Unless the commercial terms of a specific plan provide otherwise, cancellation shall not give rise to any right to refunds for periods already paid.

10.2 CliniScribe may suspend or terminate the Professional’s access, in whole or in part, when:

There is a serious or repeated breach of these Terms (in particular, regarding improper use of patient data, lack of professional authorization or unlawful use of the Service).

There are requirements from a competent authority that so demand.

11. Governing law and jurisdiction

11.1 These Terms shall be governed by and interpreted in accordance with the laws of the Republic of Chile, without prejudice to the public health or data protection regulations that must be applied in the Professional’s jurisdiction.

11.2 Any dispute relating to the validity, interpretation or performance of these Terms shall be submitted to the ordinary courts of justice sitting in the city of Santiago, Chile, unless mandatory rules provide for a different jurisdiction.

12. General provisions

12.1 If any provision of these Terms is declared null, illegal or unenforceable by a competent court, such provision shall be deemed deleted or limited to the extent necessary, without affecting the validity of the remaining clauses.

12.2 The fact that CliniScribe does not exercise any right or action arising from these Terms shall not constitute a waiver thereof.

SERVICE PROVIDER INFORMATION

Corporate name: SiemprePro SpA

RUT: 78.117.275-8

Registered address: Cerro el Plomo 5931, office 1213, Las Condes, Región Metropolitana, Chile

Contact email: support@cliniscribe.io`;

  const raw =
    language === 'en' ? rawEN : language === 'pt' ? rawPT : rawES;

  return (
    <div className="space-y-2 text-justify text-slate-600 dark:text-slate-300 font-sans text-sm md:text-base leading-relaxed">
      {renderWithBold(raw)}
    </div>
  );
};
