import { useForceUpdate } from '@genshin-optimizer/common/react-util'
import {
  BootstrapTooltip,
  CardThemed,
  SqBadge,
} from '@genshin-optimizer/common/ui'
import { charKeyToLocGenderedCharKey } from '@genshin-optimizer/gi/consts'
import { useDBMeta, useDatabase } from '@genshin-optimizer/gi/db-ui'
import { CharacterName, SillyContext } from '@genshin-optimizer/gi/ui'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import InfoIcon from '@mui/icons-material/Info'
import {
  Box,
  Button,
  CardContent,
  Divider,
  Grid,
  Typography,
} from '@mui/material'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CharacterContext } from '../../../Context/CharacterContext'
import { getCharSheet } from '../../../Data/Characters'
import TeamCard from '../../../PageTeams/TeamCard'
import CloseButton from '../../CloseButton'
import ImgIcon from '../../Image/ImgIcon'
import LevelSelect from '../../LevelSelect'
import {
  CharacterCompactConstSelector,
  CharacterCoverArea,
} from '../CharacterProfilePieces'
import TalentDropdown from '../TalentDropdown'
import { CharacterLoadout } from './CharacterLoadout'
import TravelerGenderSelect from './TravelerGenderSelect'

export default function Content({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation([
    'page_character',
    // Always load these 2 so character names are loaded for searching/sorting
    'sillyWisher_charNames',
    'charNames_gen',
  ])
  const navigate = useNavigate()
  const database = useDatabase()
  const {
    character,
    character: { key: characterKey },
    characterSheet,
  } = useContext(CharacterContext)
  const { gender } = useDBMeta()
  const { silly } = useContext(SillyContext)
  const deleteCharacter = useCallback(async () => {
    let name = getCharSheet(characterKey, gender).name
    // Use translated string
    if (typeof name === 'object')
      name = t(
        `${
          silly ? 'sillyWisher_charNames' : 'charNames_gen'
        }:${charKeyToLocGenderedCharKey(characterKey, gender)}`
      )

    if (!window.confirm(t('removeCharacter', { value: name }))) return
    database.chars.remove(characterKey)
    navigate('/characters')
  }, [database, navigate, characterKey, gender, silly, t])

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box display="flex" gap={1}>
        <TravelerGenderSelect />
        <Button
          color="error"
          onClick={() => deleteCharacter()}
          startIcon={<DeleteForeverIcon />}
          sx={{ marginLeft: 'auto' }}
        >
          {t('delete')}
        </Button>
        {!!onClose && <CloseButton onClick={onClose} />}
      </Box>
      <Box>
        <Grid
          container
          spacing={1}
          justifyContent="center"
          alignItems="flex-start"
        >
          <Grid item xs={8} sm={5} md={4} lg={3}>
            <CardThemed
              bgt="light"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <CharacterCoverArea />
              <Box sx={{ px: 1 }}>
                <LevelSelect
                  level={character.level}
                  ascension={character.ascension}
                  setBoth={(data) => database.chars.set(characterKey, data)}
                />
              </Box>
              <Typography sx={{ textAlign: 'center', pb: -1 }} variant="h6">
                {characterSheet.constellationName}
              </Typography>
              <CharacterCompactConstSelector />
            </CardThemed>
          </Grid>
          <Grid
            item
            xs={12}
            sm={7}
            md={8}
            lg={9}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Box>
              <Grid container columns={3} spacing={1}>
                {(['auto', 'skill', 'burst'] as const).map((talentKey) => (
                  <Grid item xs={1}>
                    <TalentDropdown
                      key={talentKey}
                      talentKey={talentKey}
                      dropDownButtonProps={{
                        startIcon: (
                          <ImgIcon
                            src={characterSheet.getTalentOfKey(talentKey)?.img}
                            size={1.75}
                            sideMargin
                          />
                        ),
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            <InTeam />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

const columns = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 3,
  xl: 3,
} as const
function InTeam() {
  const navigate = useNavigate()

  const {
    character: { key: characterKey },
  } = useContext(CharacterContext)
  const database = useDatabase()
  const { gender } = useDBMeta()
  const [dbDirty, setDbDirty] = useForceUpdate()
  const loadoutTeamMap = useMemo(() => {
    const loadoutTeamMap: Record<string, string[]> = {}
    database.teamChars.entries.map(([teamCharId, teamChar]) => {
      if (teamChar.key !== characterKey) return
      if (!loadoutTeamMap[teamCharId]) loadoutTeamMap[teamCharId] = []
    })
    database.teams.entries.forEach(([teamId, team]) => {
      const teamCharIdWithCKey = team.teamCharIds.find(
        (teamCharId) => database.teamChars.get(teamCharId)?.key === characterKey
      )
      if (teamCharIdWithCKey) loadoutTeamMap[teamCharIdWithCKey].push(teamId)
    })
    return dbDirty && loadoutTeamMap
  }, [dbDirty, characterKey, database])
  useEffect(
    () => database.teams.followAny(() => setDbDirty()),
    [database, setDbDirty]
  )
  useEffect(
    () => database.teamChars.followAny(() => setDbDirty()),
    [database, setDbDirty]
  )
  const onAddTeam = (teamCharId: string) => {
    const teamId = database.teams.new()
    database.teams.set(teamId, (team) => {
      team.teamCharIds[0] = teamCharId
    })
    navigate(`/teams/${teamId}`)
  }
  const onAddNewTeam = () => {
    const teamId = database.teams.new()
    const teamCharId = database.teamChars.new(characterKey)
    database.teams.set(teamId, (team) => {
      team.teamCharIds[0] = teamCharId
    })
    navigate(`/teams/${teamId}`)
  }
  const onDelete = (teamCharId: string) => {
    if (
      !window.confirm(
        'The loadouts and data (such as multi-opts) on this character will be deleted.'
      )
    )
      return
    database.teamChars.remove(teamCharId)
  }
  const onDup = (teamCharId: string) => {
    const newTeamCharId = database.teamChars.duplicate(teamCharId)
    if (!newTeamCharId) return
  }
  // TODO: Translation
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant={'h6'}>
        Team Loadouts with{' '}
        <CharacterName characterKey={characterKey} gender={gender} />
      </Typography>

      {Object.entries(loadoutTeamMap).map(([teamCharId, teamIds]) => {
        const { name, description, buildIds, buildTcIds } =
          database.teamChars.get(teamCharId)!
        return (
          <CardThemed key={teamCharId} bgt="light">
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography>{name}</Typography>
                <BootstrapTooltip
                  title={<Typography>{description}</Typography>}
                >
                  <InfoIcon />
                </BootstrapTooltip>
                <SqBadge color={buildIds.length ? 'primary' : 'secondary'}>
                  {buildIds.length} Builds
                </SqBadge>
                <SqBadge color={buildTcIds.length ? 'primary' : 'secondary'}>
                  {buildTcIds.length} TC Builds
                </SqBadge>
                <Button
                  color="info"
                  onClick={() => onDup(teamCharId)}
                  sx={{ ml: 'auto' }}
                >
                  <ContentCopyIcon />
                </Button>
                <Button color="error" onClick={() => onDelete(teamCharId)}>
                  <DeleteForeverIcon />
                </Button>
              </Box>
            </CardContent>
            <Divider />
            <CardContent>
              <Grid
                container
                direction="row"
                justifyContent="flex-start"
                alignItems="flex-start"
                columns={columns}
                spacing={2}
              >
                <CharacterLoadout activeCharId={teamCharId} />
                {teamIds.map((teamId) => (
                  <Grid item xs={1} key={teamId}>
                    <TeamCard
                      teamId={teamId}
                      onClick={(cid) =>
                        navigate(`/teams/${teamId}${cid ? `/${cid}` : ''}`)
                      }
                      disableButtons
                    />
                  </Grid>
                ))}
                <Grid item {...columns}>
                  <Button
                    fullWidth
                    sx={{ height: '100%' }}
                    onClick={() => onAddTeam(teamCharId)}
                    color="info"
                    startIcon={<AddIcon />}
                  >
                    Add new Team
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </CardThemed>
        )
      })}
      <Button
        fullWidth
        onClick={() => onAddNewTeam()}
        color="info"
        startIcon={<AddIcon />}
      >
        Add new Loadout+Team
      </Button>
      <CardThemed bgt="light"></CardThemed>
    </Box>
  )
}
