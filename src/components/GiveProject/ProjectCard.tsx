import { Button, Typography, Grid, Paper, Tooltip, Link, LinearProgress } from "@material-ui/core";
import Countdown from "react-countdown";
import SvgIcon from "@material-ui/core/SvgIcon";
import { ReactComponent as ClockIcon } from "../../assets/icons/clock.svg";
import { ReactComponent as CheckIcon } from "../../assets/icons/check-circle.svg";
import { ReactComponent as ArrowRight } from "../../assets/icons/arrow-right.svg";
import { useEffect, useState } from "react";
import { useTheme } from "@material-ui/core/styles";
import { useAppDispatch } from "src/hooks";
import { getRedemptionBalancesAsync } from "src/helpers/GiveRedemptionBalanceHelper";
import { unwrapResult } from "@reduxjs/toolkit";
import { useWeb3Context } from "src/hooks/web3Context";
import { Skeleton } from "@material-ui/lab";
import { BigNumber } from "bignumber.js";
import { RecipientModal, SubmitCallback, CancelCallback } from "src/views/Give/RecipientModal";
import { changeGive, ACTION_GIVE } from "src/slices/GiveThunk";
import { error } from "../../slices/MessagesSlice";
import { Project } from "./project.type";
import { countDecimals, roundToDecimal, toInteger } from "./utils";
import { ReactComponent as WebsiteIcon } from "../../assets/icons/website.svg";
import { ReactComponent as DonatedIcon } from "../../assets/icons/donated.svg";
import { ReactComponent as GoalIcon } from "../../assets/icons/goal.svg";

type CountdownProps = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  completed: boolean;
  formatted: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
};

export enum ProjectDetailsMode {
  Card = "Card",
  Page = "Page",
}

type ProjectDetailsProps = {
  project: Project;
  mode: ProjectDetailsMode;
};

export default function ProjectCard({ project, mode }: ProjectDetailsProps) {
  const { provider, address, connected, connect, chainID } = useWeb3Context();
  const { title, owner, details, finishDate, photos, category, wallet, depositGoal } = project;
  const [recipientInfoIsLoading, setRecipientInfoIsLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState("");

  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);

  const theme = useTheme();
  // We use useAppDispatch here so the result of the AsyncThunkAction is typed correctly
  // See: https://stackoverflow.com/a/66753532
  const dispatch = useAppDispatch();

  // When the user's wallet is connected, we perform these actions
  useEffect(() => {
    if (!connected) return;

    // We use dispatch to asynchronously fetch the results, and then update state variables so that the component refreshes
    // We DO NOT use dispatch here, because it will overwrite the state variables in the redux store, which then creates havoc
    // e.g. the redeem yield page will show someone else's deposited sOHM and redeemable yield
    getRedemptionBalancesAsync({
      networkID: chainID,
      provider: provider,
      address: wallet,
    }).then(resultAction => {
      setTotalDebt(resultAction.redeeming.recipientInfo.totalDebt);
      setRecipientInfoIsLoading(false);
    });
  }, [connected]);

  // The JSON file returns a string, so we convert it
  const finishDateObject = finishDate ? new Date(finishDate) : null;
  const countdownRenderer = ({ days, hours, minutes, completed }: CountdownProps) => {
    if (completed)
      return (
        <>
          <div className="cause-info-icon">
            <SvgIcon component={ClockIcon} color="primary" />
          </div>
          <div>
            <div className="cause-info-bottom-text">
              <strong>Fundraise Complete!</strong>
            </div>
          </div>
        </>
      );

    return (
      <>
        <div className="cause-info-icon">
          <SvgIcon component={ClockIcon} color="primary" />
        </div>
        <div>
          <Tooltip
            title={!finishDateObject ? "" : "Finishes at " + finishDateObject.toLocaleString() + " in your timezone"}
            arrow
          >
            <div>
              <div className="cause-info-main-text">
                <strong>
                  {days}:{hours}:{minutes}
                </strong>
              </div>
              <span className="cause-info-bottom-text">remaining</span>
            </div>
          </Tooltip>
        </div>
      </>
    );
  };
  const countdownRendererDetailed = ({ days, hours, minutes, completed, formatted }: CountdownProps) => {
    if (completed)
      return (
        <>
          <Grid container className="countdown-container">
            <Grid item xs={3}>
              <SvgIcon component={ClockIcon} color="primary" />
            </Grid>
            <Grid item xs={9} className="project-countdown-text">
              Fundraise Complete!
            </Grid>
          </Grid>
        </>
      );

    return (
      <>
        <>
          <Grid container className="countdown-container">
            <Tooltip
              title={!finishDateObject ? "" : "Finishes at " + finishDateObject.toLocaleString() + " in your timezone"}
              arrow
            >
              <Grid item xs={10} className="countdown-object">
                <div>
                  <SvgIcon component={ClockIcon} color="primary" />
                </div>
                <div className="project-countdown-text">
                  <div>
                    {" "}
                    <Typography variant="h6">
                      <strong>
                        {formatted.days}:{formatted.hours}:{formatted.minutes}
                      </strong>
                    </Typography>
                    <span className="cause-info-bottom-text"> remaining</span>
                  </div>
                </div>
              </Grid>
            </Tooltip>
          </Grid>
        </>
      </>
    );
  };

  const getGoalCompletion = (): string => {
    if (!depositGoal) return "NaN";
    if (recipientInfoIsLoading) return ""; // This shouldn't be needed, but just to be sure...
    if (!totalDebt) return "0";

    const totalDebtNumber = new BigNumber(totalDebt);

    return totalDebtNumber.div(depositGoal).multipliedBy(100).toFixed();
  };

  const renderGoalCompletion = (): JSX.Element => {
    const goalCompletion = getGoalCompletion();
    const formattedGoalCompletion =
      countDecimals(goalCompletion) === 0 ? toInteger(goalCompletion) : roundToDecimal(goalCompletion);

    return (
      <>
        <div className="cause-info-icon">
          <SvgIcon component={CheckIcon} color="primary" />
        </div>
        <div>
          <Tooltip title={totalDebt + " of " + depositGoal + " sOHM raised"} arrow>
            <div>
              <div className="cause-info-main-text">
                <strong>{recipientInfoIsLoading ? <Skeleton /> : formattedGoalCompletion}%</strong>
              </div>
              <span className="cause-info-bottom-text">of goal</span>
            </div>
          </Tooltip>
        </div>
      </>
    );
  };

  const renderGoalCompletionDetailed = (): JSX.Element => {
    const goalProgress = parseFloat(getGoalCompletion()) > 100 ? 100 : parseFloat(getGoalCompletion());

    return (
      <>
        <Grid container className="project-goal">
          <Grid item xs={4} className="project-donated">
            <div className="project-donated-icon">
              <SvgIcon component={DonatedIcon} />
              <Typography variant="h6">
                <strong>{totalDebt} sOHM</strong>
              </Typography>
            </div>
            <div className="subtext">Donated</div>
          </Grid>
          <Grid item xs={4} />
          <Grid item xs={4} className="project-completion">
            <div className="project-completion-icon">
              <SvgIcon component={GoalIcon} />
              <Typography variant="h6">
                <strong>{depositGoal} sOHM</strong>
              </Typography>
            </div>
            <div className="subtext">Goal</div>
          </Grid>
        </Grid>
        <div className="project-goal-progress">
          <LinearProgress variant="determinate" value={goalProgress} />
        </div>
      </>
    );
  };

  const getProjectImage = (): JSX.Element => {
    // We return an empty image with a set width, so that the spacing remains the same.
    if (!photos || photos.length < 1)
      return (
        <div className="cause-image">
          <img width="100%" src="" />
        </div>
      );

    return (
      <div className="cause-image">
        <Link href={`#/give/projects/${project.slug}`}>
          <img width="100%" src={`${process.env.PUBLIC_URL}${photos[0]}`} />
        </Link>
      </div>
    );
  };

  const handleGiveButtonClick = () => {
    setIsGiveModalOpen(true);
  };

  const handleGiveModalSubmit: SubmitCallback = async (
    walletAddress: string,
    depositAmount: BigNumber,
    depositAmountDiff?: BigNumber,
  ) => {
    if (depositAmount.isEqualTo(new BigNumber(0))) {
      return dispatch(error("Please enter a value!"));
    }

    // Record segment user event

    // If reducing the amount of deposit, withdraw
    await dispatch(
      changeGive({
        action: ACTION_GIVE,
        value: depositAmount.toFixed(),
        recipient: walletAddress,
        provider,
        address,
        networkID: chainID,
      }),
    );

    setIsGiveModalOpen(false);
  };

  const handleGiveModalCancel: CancelCallback = () => {
    setIsGiveModalOpen(false);
  };

  const getCardContent = () => {
    return (
      <>
        <Paper style={{ backdropFilter: "none", backgroundColor: "transparent" }}>
          <Grid item className="cause-card" key={title}>
            {getProjectImage()}
            <div className="cause-content">
              <Grid container className="cause-header">
                <Grid item className="cause-title">
                  <Link href={`#/give/projects/${project.slug}`}>
                    <Typography variant="h5">
                      <strong>
                        {owner} - {title}
                      </strong>
                    </Typography>
                  </Link>
                </Grid>
                <Grid item className="view-details">
                  <Link href={`#/give/projects/${project.slug}`} className="cause-link">
                    <Typography variant="body1">View Details</Typography>
                    <SvgIcon
                      component={ArrowRight}
                      style={{ width: "30px", marginLeft: "0.33em" }}
                      viewBox={"0 0 57 24"}
                    />
                  </Link>
                </Grid>
              </Grid>
              <Typography variant="body1"></Typography>
              <div className="cause-body">
                <Typography variant="body1" style={{ lineHeight: "20px" }}>
                  {details}
                </Typography>
              </div>
              <Grid container direction="column" className="cause-misc-info">
                <Grid item xs={3}>
                  {finishDateObject ? <Countdown date={finishDateObject} renderer={countdownRenderer} /> : <></>}
                </Grid>
                <Grid item xs={3}>
                  {renderGoalCompletion()}
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    className="cause-give-button"
                    onClick={() => handleGiveButtonClick()}
                    disabled={!address}
                  >
                    <Typography variant="h6">Give Yield</Typography>
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Paper>
        <RecipientModal
          isModalOpen={isGiveModalOpen}
          callbackFunc={handleGiveModalSubmit}
          cancelFunc={handleGiveModalCancel}
          project={project}
          key={title}
        />
      </>
    );
  };

  const renderCountdownDetailed = () => {
    if (!finishDateObject) return <></>;

    return (
      <Grid container className="project-countdown">
        <Grid item xs={3}></Grid>
        <Grid item xs={6}>
          <Countdown date={finishDateObject} renderer={countdownRendererDetailed} />
        </Grid>{" "}
        <Grid item xs={3}></Grid>
      </Grid>
    );
  };

  const getPageContent = () => {
    return (
      <>
        <Grid container className="project">
          <Grid item xs={1}></Grid>
          <Grid item xs={4}>
            <Paper className="project-sidebar">
              <Grid container className="project-intro" justifyContent="space-between">
                <Grid item className="project-title">
                  <Typography variant="h4">
                    <strong>{title}</strong>
                  </Typography>
                </Grid>
                <Grid item className="project-link">
                  <Link href={project.website} target="_blank">
                    <SvgIcon color="primary" component={WebsiteIcon} />
                  </Link>
                </Grid>
              </Grid>
              {getProjectImage()}
              {renderGoalCompletionDetailed()}
              {renderCountdownDetailed()}

              <div className="project-give-button">
                <Button variant="contained" color="primary" onClick={() => handleGiveButtonClick()} disabled={!address}>
                  <Typography variant="h6">Give Yield</Typography>
                </Button>
              </div>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper className="project-info">
              <Typography variant="h5" className="project-about-header">
                <strong>About</strong>
              </Typography>
              <div>
                <Typography variant="body1">{project.details}</Typography>
              </div>
            </Paper>
          </Grid>
        </Grid>
      </>
    );
  };

  if (mode == ProjectDetailsMode.Card) return getCardContent();
  else return getPageContent();
}
